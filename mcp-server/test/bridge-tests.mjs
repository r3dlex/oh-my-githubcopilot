import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

// Import from compiled dist/
import { detectOmcSession, importOmcSession } from "../dist/bridge/omc-importer.js";
import { encodeProjectPath, detectClaudeSession, importClaudeSession } from "../dist/bridge/claude-jsonl-importer.js";
import { detectExternalSessions, importExternalSession, compareCheckpoints } from "../dist/bridge/index.js";

// ──────────────────────────────────────────────
// omc-importer tests
// ──────────────────────────────────────────────

describe("detectOmcSession", () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "omg-bridge-test-"));
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
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "omg-import-test-"));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("imports PRD and state files from .omc/ to .omg/", () => {
    // Create fake OMC structure
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

    // Set WORKSPACE_ROOT for the import
    const originalRoot = process.env.WORKSPACE_ROOT;
    process.env.WORKSPACE_ROOT = tmpDir;

    try {
      const result = importOmcSession(tmpDir);
      assert.equal(result.source, "omc");
      assert.ok(result.imported_files.length > 0);
      assert.ok(result.summary.includes("Test PRD"));
      assert.ok(result.summary.includes("1/2 stories done"));

      // Verify files were copied to .omg/
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
// claude-jsonl-importer tests
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
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "omg-claude-test-"));
    originalHome = process.env.HOME;
  });

  after(() => {
    process.env.HOME = originalHome;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("extracts modified files from JSONL tool_use blocks", () => {
    // Create a fake HOME with Claude structure
    const fakeHome = path.join(tmpDir, "fakehome");
    const workspaceRoot = "/Users/test/myproject";
    const encoded = workspaceRoot.replace(/\//g, "-");
    const projectDir = path.join(fakeHome, ".claude", "projects", encoded);
    fs.mkdirSync(projectDir, { recursive: true });

    // Create a fake JSONL session
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

    // Override HOME so encodeProjectPath resolves correctly
    process.env.HOME = fakeHome;

    const result = importClaudeSession(workspaceRoot);
    assert.equal(result.source, "claude-code");
    assert.equal(result.session_id, sessionId);

    // Check modified files extracted
    assert.ok(result.imported_files.includes("/Users/test/myproject/src/auth.ts"));
    assert.ok(result.imported_files.includes("/Users/test/myproject/src/login.ts"));
    assert.ok(result.imported_files.includes("/Users/test/myproject/test/auth.test.ts"));

    // Check summary contains last user prompt
    assert.ok(result.summary.includes("Now add tests for it"));
  });
});

// ──────────────────────────────────────────────
// bridge orchestrator tests
// ──────────────────────────────────────────────

describe("detectExternalSessions", () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "omg-detect-test-"));
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
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "omg-compare-test-"));
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
