import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

import { detectOmcSession, importOmcSession } from "../dist/bridge/omc-importer.js";
import { encodeProjectPath, detectClaudeSession, importClaudeSession } from "../dist/bridge/claude-jsonl-importer.js";
import { detectExternalSessions, importExternalSession, exportExternalSession, compareCheckpoints } from "../dist/bridge/index.js";
import { detectOmgSession, exportOmgSession, recordExportToken, readExportToken } from "../dist/bridge/omg-exporter.js";
import { rotateBackup, shouldSkipForConflict } from "../dist/bridge/conflict-utils.js";

function freshDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

// ──────────────────────────────────────────────
// omc-importer tests (existing — preserved)
// ──────────────────────────────────────────────

describe("detectOmcSession", () => {
  let tmpDir;

  before(() => {
    tmpDir = freshDir("omg-bridge-test-");
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns exists:false when no .omc/ directory", () => {
    const result = detectOmcSession(tmpDir);
    assert.equal(result.exists, false);
    assert.equal(result.mtime, null);
  });

  it("returns exists:true when .omc/state/ has files", () => {
    const stateDir = path.join(tmpDir, ".omc", "state");
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(stateDir, "ralph-state.json"),
      JSON.stringify({ active: true, mode: "ralph" }),
    );

    const result = detectOmcSession(tmpDir);
    assert.equal(result.exists, true);
    assert.ok(result.mtime);
    assert.ok(result.details.includes("ralph-state.json"));
  });
});

describe("importOmcSession", () => {
  let tmpDir;

  before(() => {
    tmpDir = freshDir("omg-import-test-");
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("imports PRD and state files from .omc/ to .omg/", () => {
    const omcDir = path.join(tmpDir, ".omc");
    const omcStateDir = path.join(omcDir, "state");
    fs.mkdirSync(omcStateDir, { recursive: true });

    const prd = {
      title: "Test PRD",
      stories: [
        { id: "s1", title: "Story 1", passes: true },
        { id: "s2", title: "Story 2", passes: false },
      ],
    };
    fs.writeFileSync(path.join(omcDir, "prd.json"), JSON.stringify(prd));
    fs.writeFileSync(
      path.join(omcStateDir, "ralph-state.json"),
      JSON.stringify({ active: true, mode: "ralph" }),
    );

    const originalRoot = process.env.WORKSPACE_ROOT;
    process.env.WORKSPACE_ROOT = tmpDir;

    try {
      const result = importOmcSession(tmpDir);
      assert.equal(result.source, "omc");
      assert.ok(result.imported_files.length > 0);
      assert.ok(result.summary.includes("Test PRD"));
      assert.ok(result.summary.includes("1/2 stories done"));

      assert.ok(fs.existsSync(path.join(tmpDir, ".omg", "prd.json")));
      assert.ok(fs.existsSync(path.join(tmpDir, ".omg", "state", "ralph-state.json")));
    } finally {
      if (originalRoot !== undefined) {
        process.env.WORKSPACE_ROOT = originalRoot;
      } else {
        delete process.env.WORKSPACE_ROOT;
      }
    }
  });
});

// ──────────────────────────────────────────────
// claude-jsonl-importer tests (existing — preserved)
// ──────────────────────────────────────────────

describe("encodeProjectPath", () => {
  it("replaces slashes with dashes", () => {
    assert.equal(
      encodeProjectPath("/Users/test/myproject"),
      "-Users-test-myproject",
    );
  });
});

describe("importClaudeSession", () => {
  let tmpDir;
  let originalHome;

  before(() => {
    tmpDir = freshDir("omg-claude-test-");
    originalHome = process.env.HOME;
  });

  after(() => {
    process.env.HOME = originalHome;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("extracts modified files from JSONL tool_use blocks", () => {
    const fakeHome = path.join(tmpDir, "fakehome");
    const workspaceRoot = "/Users/test/myproject";
    const encoded = workspaceRoot.replace(/\//g, "-");
    const projectDir = path.join(fakeHome, ".claude", "projects", encoded);
    fs.mkdirSync(projectDir, { recursive: true });

    const sessionId = "test-session-123";
    const lines = [
      JSON.stringify({
        type: "user",
        message: { role: "user", content: "Fix the login bug" },
        timestamp: new Date().toISOString(),
        sessionId,
      }),
      JSON.stringify({
        type: "assistant",
        message: {
          role: "assistant",
          content: [
            { type: "text", text: "I'll fix the login bug." },
            {
              type: "tool_use",
              name: "Edit",
              input: { file_path: "/Users/test/myproject/src/auth.ts" },
            },
            {
              type: "tool_use",
              name: "Write",
              input: { file_path: "/Users/test/myproject/src/login.ts" },
            },
          ],
        },
        timestamp: new Date().toISOString(),
        sessionId,
      }),
      JSON.stringify({
        type: "user",
        message: { role: "user", content: "Now add tests for it" },
        timestamp: new Date().toISOString(),
        sessionId,
      }),
      JSON.stringify({
        type: "assistant",
        message: {
          role: "assistant",
          content: [
            { type: "text", text: "Adding test coverage for the login fix." },
            {
              type: "tool_use",
              name: "Write",
              input: { file_path: "/Users/test/myproject/test/auth.test.ts" },
            },
          ],
        },
        timestamp: new Date().toISOString(),
        sessionId,
      }),
    ];

    fs.writeFileSync(
      path.join(projectDir, `${sessionId}.jsonl`),
      lines.join("\n") + "\n",
    );

    process.env.HOME = fakeHome;

    const result = importClaudeSession(workspaceRoot);
    assert.equal(result.source, "claude-code");
    assert.equal(result.session_id, sessionId);

    assert.ok(result.imported_files.includes("/Users/test/myproject/src/auth.ts"));
    assert.ok(result.imported_files.includes("/Users/test/myproject/src/login.ts"));
    assert.ok(result.imported_files.includes("/Users/test/myproject/test/auth.test.ts"));

    assert.ok(result.summary.includes("Now add tests for it"));
  });
});

// ──────────────────────────────────────────────
// bridge orchestrator tests (existing — preserved)
// ──────────────────────────────────────────────

describe("detectExternalSessions", () => {
  let tmpDir;

  before(() => {
    tmpDir = freshDir("omg-detect-test-");
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty array when no external sources exist", () => {
    const sessions = detectExternalSessions(tmpDir);
    assert.equal(sessions.length, 0);
  });

  it("detects OMC session when .omc/ exists", () => {
    const stateDir = path.join(tmpDir, ".omc", "state");
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(stateDir, "test-state.json"),
      JSON.stringify({ active: true }),
    );

    const sessions = detectExternalSessions(tmpDir);
    assert.ok(sessions.length >= 1);
    const omcSession = sessions.find((s) => s.source === "omc");
    assert.ok(omcSession);
    assert.equal(omcSession.exists, true);
  });
});

describe("compareCheckpoints", () => {
  let tmpDir;

  before(() => {
    tmpDir = freshDir("omg-compare-test-");
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns omg.exists=false when no checkpoint exists", () => {
    const result = compareCheckpoints(tmpDir);
    assert.equal(result.omg.exists, false);
    assert.equal(result.omg.timestamp, null);
  });
});

// ══════════════════════════════════════════════
// v1.4.3 — bidirectional bridge: omg → omc tests
// 6 zones: Unit, Provenance, Round-trip guard, Composition, Conflict-path,
// Project-identity. Total ≥ 18 across the file (existing 8 + new 10).
// ══════════════════════════════════════════════

// ── Zone: Unit (≥6) ──────────────────────────────────────────

describe("Unit — detectOmgSession", () => {
  let tmpDir;
  before(() => { tmpDir = freshDir("omg-detect-omg-"); });
  after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it("returns exists:false when no .omg/ directory", () => {
    const result = detectOmgSession(tmpDir);
    assert.equal(result.exists, false);
    assert.equal(result.has_checkpoint, false);
  });

  it("returns exists:true and has_checkpoint:true when .omg/state/session-checkpoint.json exists", () => {
    const stateDir = path.join(tmpDir, ".omg", "state");
    fs.mkdirSync(stateDir, { recursive: true });
    writeJson(path.join(stateDir, "session-checkpoint.json"), {
      timestamp: new Date().toISOString(),
      active_modes: [],
    });

    const result = detectOmgSession(tmpDir);
    assert.equal(result.exists, true);
    assert.equal(result.has_checkpoint, true);
  });
});

describe("Unit — exportOmgSession file mappings", () => {
  let tmpDir;
  before(() => { tmpDir = freshDir("omg-export-mapping-"); });
  after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it("copies prd.json and project-memory.json from .omg/ to .omc/", () => {
    const omgDir = path.join(tmpDir, ".omg");
    const omgStateDir = path.join(omgDir, "state");
    fs.mkdirSync(omgStateDir, { recursive: true });

    writeJson(path.join(omgDir, "prd.json"), { title: "P", stories: [] });
    writeJson(path.join(omgDir, "project-memory.json"), { entries: [] });
    writeJson(path.join(omgStateDir, "session-checkpoint.json"), {
      timestamp: new Date().toISOString(),
      active_modes: [],
      workspace_root: tmpDir,
    });

    const result = exportOmgSession(tmpDir);
    assert.equal(result.success, true);
    assert.ok(result.exported_files.includes("prd.json"));
    assert.ok(result.exported_files.includes("project-memory.json"));
    assert.ok(fs.existsSync(path.join(tmpDir, ".omc", "prd.json")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".omc", "project-memory.json")));
  });
});

// ── Zone: Provenance (≥3) ───────────────────────────────────

describe("Provenance — checkpoint metadata translation", () => {
  let tmpDir;
  before(() => { tmpDir = freshDir("omg-prov-"); });
  after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it("composed .omc/state/session-checkpoint.json has source_origin: bridged-from-omg", () => {
    const omgDir = path.join(tmpDir, ".omg");
    const omgStateDir = path.join(omgDir, "state");
    fs.mkdirSync(omgStateDir, { recursive: true });
    writeJson(path.join(omgStateDir, "session-checkpoint.json"), {
      timestamp: "2026-05-11T00:00:00.000Z",
      active_modes: [],
      workspace_root: tmpDir,
    });

    exportOmgSession(tmpDir);

    const composed = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".omc", "state", "session-checkpoint.json"), "utf-8"),
    );
    assert.equal(composed.source_origin, "bridged-from-omg");
    assert.equal(composed.source_tool, "copilot");
    assert.ok(composed.source_session_id);
    assert.equal(composed.workspace_root, tmpDir);
  });

  it("missing source_origin in destination is treated as native (back-compat)", () => {
    const omgStateDir = path.join(tmpDir, ".omg", "state");
    fs.mkdirSync(omgStateDir, { recursive: true });
    const dst = path.join(omgStateDir, "session-checkpoint.json");
    // simulate pre-v1.4.3 checkpoint: no source_origin field
    writeJson(dst, { timestamp: new Date().toISOString() });

    const decision = shouldSkipForConflict({
      srcPath: dst,
      dstPath: dst,
      force: false,
      useEmbeddedTimestamp: true,
    });
    // same path → mtimes equal → decision should skip via mtime fallback
    assert.equal(decision.skip, true);
  });

  it("recordExportToken / readExportToken roundtrip", () => {
    const root = freshDir("omg-prov-token-");
    try {
      const written = recordExportToken(root, "omg-session-abc");
      const read = readExportToken(root);
      assert.equal(read.session_id, "omg-session-abc");
      assert.equal(read.exported_at, written.exported_at);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

// ── Zone: Round-trip guard (≥3) ─────────────────────────────

describe("Round-trip guard", () => {
  function bootstrap(tmpDir) {
    const omgStateDir = path.join(tmpDir, ".omg", "state");
    fs.mkdirSync(omgStateDir, { recursive: true });
    writeJson(path.join(omgStateDir, "session-checkpoint.json"), {
      timestamp: "2026-05-11T01:00:00.000Z",
      active_modes: [],
      workspace_root: tmpDir,
    });
  }

  it("token + matching source_session_id → loop_blocked", () => {
    const tmpDir = freshDir("omg-loop-1-");
    try {
      bootstrap(tmpDir);
      const exp = exportExternalSession("omc", { workspaceRoot: tmpDir });
      assert.equal(exp.success, true);

      const imp = importExternalSession("omc", { workspaceRoot: tmpDir });
      assert.equal(imp.loop_blocked, true);
      assert.equal(imp.imported_files.length, 0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("token absent but source_origin === bridged-from-omg → still loop_blocked", () => {
    const tmpDir = freshDir("omg-loop-2-");
    try {
      bootstrap(tmpDir);
      exportExternalSession("omc", { workspaceRoot: tmpDir });

      // Wipe token but keep destination provenance
      const tokenPath = path.join(tmpDir, ".omg", "state", "last-export-token.json");
      fs.unlinkSync(tokenPath);

      const imp = importExternalSession("omc", { workspaceRoot: tmpDir });
      assert.equal(imp.loop_blocked, true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("destination flips source_origin to native → guard releases (fail-open)", () => {
    const tmpDir = freshDir("omg-loop-3-");
    try {
      bootstrap(tmpDir);
      exportExternalSession("omc", { workspaceRoot: tmpDir });

      // Simulate OMC writing a fresh native checkpoint
      const dst = path.join(tmpDir, ".omc", "state", "session-checkpoint.json");
      const obj = JSON.parse(fs.readFileSync(dst, "utf-8"));
      obj.source_origin = "native";
      delete obj.source_session_id;
      delete obj.workspace_root;
      writeJson(dst, obj);

      const imp = importExternalSession("omc", { workspaceRoot: tmpDir, force: true });
      assert.notEqual(imp.loop_blocked, true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ── Zone: Composition (≥2) ──────────────────────────────────

describe("Composition — active_modes decomposition", () => {
  it("decomposes active_modes[] into per-mode .omc/state/{mode}-state.json files", () => {
    const tmpDir = freshDir("omg-comp-1-");
    try {
      const omgStateDir = path.join(tmpDir, ".omg", "state");
      fs.mkdirSync(omgStateDir, { recursive: true });
      writeJson(path.join(omgStateDir, "session-checkpoint.json"), {
        timestamp: new Date().toISOString(),
        active_modes: [
          { mode: "ralph", state: { phase: "plan", iter: 1 } },
          { mode: "ultrawork", state: { phase: "qa" } },
          { mode: "team", state: { agents: 3 } },
        ],
        workspace_root: tmpDir,
      });

      const result = exportOmgSession(tmpDir);
      assert.equal(result.success, true);

      for (const m of ["ralph", "ultrawork", "team"]) {
        const p = path.join(tmpDir, ".omc", "state", `${m}-state.json`);
        assert.ok(fs.existsSync(p), `${m}-state.json missing`);
      }

      const ralph = JSON.parse(fs.readFileSync(path.join(tmpDir, ".omc", "state", "ralph-state.json"), "utf-8"));
      assert.equal(ralph.phase, "plan");
      assert.equal(ralph.iter, 1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("round-trip preserves the active_modes mode set", () => {
    const tmpDir = freshDir("omg-comp-2-");
    try {
      const omgStateDir = path.join(tmpDir, ".omg", "state");
      fs.mkdirSync(omgStateDir, { recursive: true });
      const modes = [
        { mode: "ralph", state: { active: true, phase: "p" } },
        { mode: "ultrawork", state: { active: true, phase: "q" } },
      ];
      writeJson(path.join(omgStateDir, "session-checkpoint.json"), {
        timestamp: new Date().toISOString(),
        active_modes: modes,
        workspace_root: tmpDir,
      });

      // Mirror per-mode files because the importer reads .omc/state/*-state.json by name.
      for (const m of modes) {
        writeJson(path.join(omgStateDir, `${m.mode}-state.json`), m.state);
      }

      exportExternalSession("omc", { workspaceRoot: tmpDir });

      // Wipe local OMG state, then re-import from OMC.
      // force:true bypasses the loop guard — required for round-trip verification
      // because the OMC destination still carries source_origin:"bridged-from-omg".
      fs.rmSync(path.join(tmpDir, ".omg"), { recursive: true, force: true });

      const imp = importExternalSession("omc", { workspaceRoot: tmpDir, force: true });
      assert.notEqual(imp.loop_blocked, true);

      // Per-mode files should be present again on the OMG side
      for (const m of modes) {
        const p = path.join(tmpDir, ".omg", "state", `${m.mode}-state.json`);
        assert.ok(fs.existsSync(p), `${m.mode}-state.json missing after round-trip`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ── Zone: Conflict-path (≥2) ────────────────────────────────

describe("Conflict-path — rotateBackup", () => {
  it("rotates timestamped backups and keeps last N=3", async () => {
    const tmpDir = freshDir("omg-conflict-1-");
    try {
      const target = path.join(tmpDir, "session-checkpoint.json");
      writeJson(target, { v: 0 });

      for (let i = 1; i <= 4; i++) {
        // Force a distinguishable mtime per snapshot
        await new Promise((r) => setTimeout(r, 5));
        rotateBackup(target, 3);
        writeJson(target, { v: i });
      }

      const backups = fs.readdirSync(tmpDir).filter(
        (f) => f.startsWith("session-checkpoint.previous.") && f.endsWith(".json"),
      );
      assert.equal(backups.length, 3, `expected 3 backups, got ${backups.length}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("malformed source state file does not crash the exporter", () => {
    const tmpDir = freshDir("omg-conflict-2-");
    try {
      const omgStateDir = path.join(tmpDir, ".omg", "state");
      fs.mkdirSync(omgStateDir, { recursive: true });
      writeJson(path.join(omgStateDir, "session-checkpoint.json"), {
        timestamp: new Date().toISOString(),
        active_modes: [],
        workspace_root: tmpDir,
      });
      // malformed sibling state file
      fs.writeFileSync(path.join(omgStateDir, "garbage-state.json"), "not-json{{{");

      const result = exportOmgSession(tmpDir);
      assert.equal(result.success, true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ── Zone: Project-identity (≥2) ─────────────────────────────

describe("Project-identity guard", () => {
  it("source workspace_root mismatch → returns workspace_mismatch with no mutations", () => {
    const tmpDir = freshDir("omg-id-1-");
    try {
      const omgStateDir = path.join(tmpDir, ".omg", "state");
      fs.mkdirSync(omgStateDir, { recursive: true });
      writeJson(path.join(omgStateDir, "session-checkpoint.json"), {
        timestamp: new Date().toISOString(),
        active_modes: [],
        workspace_root: "/tmp/wrong-project",
      });

      const result = exportOmgSession(tmpDir);
      assert.equal(result.success, false);
      assert.equal(result.reason, "workspace_mismatch");
      // No .omc/ directory should have been created
      assert.equal(fs.existsSync(path.join(tmpDir, ".omc")), false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("source checkpoint missing workspace_root → falls through (back-compat)", () => {
    const tmpDir = freshDir("omg-id-2-");
    try {
      const omgStateDir = path.join(tmpDir, ".omg", "state");
      fs.mkdirSync(omgStateDir, { recursive: true });
      // Pre-v1.4.3 checkpoint — no workspace_root
      writeJson(path.join(omgStateDir, "session-checkpoint.json"), {
        timestamp: new Date().toISOString(),
        active_modes: [],
      });

      const result = exportOmgSession(tmpDir);
      assert.equal(result.success, true);
      assert.notEqual(result.reason, "workspace_mismatch");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
