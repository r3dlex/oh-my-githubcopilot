import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

// Import from compiled dist/
import {
  validateMode,
  safeJsonParse,
  generateId,
  safeReadFile,
  safeWriteFile,
} from "../dist/utils.js";

import { getStatePath } from "../dist/state-tools.js";
import {
  checkpointUltragoal,
  completeUltragoal,
  createUltragoalGoal,
  getUltragoalLedgerPath,
  getUltragoalStatus,
} from "../dist/ultragoal-tools.js";

// ──────────────────────────────────────────────
// utils.ts tests
// ──────────────────────────────────────────────

describe("validateMode", () => {
  it("accepts valid alphanumeric mode names", () => {
    assert.doesNotThrow(() => validateMode("omg-autopilot"));
    assert.doesNotThrow(() => validateMode("ralph"));
    assert.doesNotThrow(() => validateMode("ultra-work"));
    assert.doesNotThrow(() => validateMode("self_improve"));
    assert.doesNotThrow(() => validateMode("Mode123"));
  });

  it("rejects path traversal attempts", () => {
    assert.throws(() => validateMode("../../etc"), /Invalid mode name/);
    assert.throws(() => validateMode("../passwd"), /Invalid mode name/);
    assert.throws(() => validateMode("foo/bar"), /Invalid mode name/);
  });

  it("rejects names with special characters", () => {
    assert.throws(() => validateMode("mode name"), /Invalid mode name/);
    assert.throws(() => validateMode("mode;rm"), /Invalid mode name/);
    assert.throws(() => validateMode(""), /Invalid mode name/);
  });

  it("allows __proto__ because it matches [a-zA-Z0-9_-]+", () => {
    // __proto__ is alphanumeric + underscores, so validateMode should pass it.
    // Protection against __proto__ is handled by safeJsonParse, not validateMode.
    assert.doesNotThrow(() => validateMode("__proto__"));
  });
});

describe("safeJsonParse", () => {
  it("parses valid JSON objects", () => {
    const result = safeJsonParse('{"a":1}');
    assert.equal(result.ok, true);
    assert.deepStrictEqual(result.data, { a: 1 });
  });

  it("strips __proto__ key to prevent prototype pollution", () => {
    const result = safeJsonParse('{"__proto__":{"x":1},"safe":"yes"}');
    assert.equal(result.ok, true);
    assert.deepStrictEqual(result.data, { safe: "yes" });
    assert.equal(Object.hasOwn(result.data, "__proto__"), false);
  });

  it("strips constructor and prototype keys", () => {
    const result = safeJsonParse('{"constructor":1,"prototype":2,"valid":"ok"}');
    assert.equal(result.ok, true);
    assert.deepStrictEqual(result.data, { valid: "ok" });
  });

  it("returns ok:false for invalid JSON", () => {
    const result = safeJsonParse("invalid");
    assert.equal(result.ok, false);
  });

  it("returns ok:false for JSON arrays", () => {
    const result = safeJsonParse("[1,2,3]");
    assert.equal(result.ok, false);
  });

  it("returns ok:false for JSON primitives", () => {
    const result = safeJsonParse('"just a string"');
    assert.equal(result.ok, false);
  });

  it("returns ok:false for null", () => {
    const result = safeJsonParse("null");
    assert.equal(result.ok, false);
  });
});

describe("generateId", () => {
  it("returns an 8-character string", () => {
    const id = generateId();
    assert.equal(typeof id, "string");
    assert.equal(id.length, 8);
  });

  it("returns unique values on successive calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateId()));
    assert.equal(ids.size, 20);
  });
});

describe("safeReadFile / safeWriteFile", () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "omg-test-"));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns null for non-existent file", () => {
    const result = safeReadFile(path.join(tmpDir, "nope.txt"));
    assert.equal(result, null);
  });

  it("roundtrips write then read", () => {
    const filePath = path.join(tmpDir, "test.json");
    const content = '{"hello":"world"}';
    safeWriteFile(filePath, content);
    const read = safeReadFile(filePath);
    assert.equal(read, content);
  });

  it("returns null for symlinks", () => {
    const realFile = path.join(tmpDir, "real.txt");
    const symlink = path.join(tmpDir, "link.txt");
    fs.writeFileSync(realFile, "data");
    fs.symlinkSync(realFile, symlink);
    const result = safeReadFile(symlink);
    assert.equal(result, null);
  });
});

// ──────────────────────────────────────────────
// state-tools.ts tests
// ──────────────────────────────────────────────

describe("getStatePath", () => {
  it("returns a path ending with mode-state.json for valid modes", () => {
    const p = getStatePath("omg-autopilot");
    assert.ok(p.endsWith("omg-autopilot-state.json"));
    assert.ok(p.includes(".omg"));
  });

  it("throws for invalid mode names", () => {
    assert.throws(() => getStatePath("../../etc"), /Invalid mode name/);
    assert.throws(() => getStatePath("foo bar"), /Invalid mode name/);
    assert.throws(() => getStatePath(""), /Invalid mode name/);
  });
});

// ──────────────────────────────────────────────
// ultragoal-tools.ts tests
// ──────────────────────────────────────────────

describe("ultragoal helpers", () => {
  let tmpDir;
  let previousWorkspaceRoot;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "omg-ultragoal-test-"));
    previousWorkspaceRoot = process.env.WORKSPACE_ROOT;
    process.env.WORKSPACE_ROOT = tmpDir;
  });

  after(() => {
    if (previousWorkspaceRoot === undefined) {
      delete process.env.WORKSPACE_ROOT;
    } else {
      process.env.WORKSPACE_ROOT = previousWorkspaceRoot;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("rejects empty objectives without creating artifacts", () => {
    assert.throws(() => createUltragoalGoal("   "), /objective is required/i);
    assert.equal(fs.existsSync(getUltragoalLedgerPath()), false);
  });

  it("creates, checkpoints, and completes an active ultragoal", () => {
    const created = createUltragoalGoal("Port ultragoal to OMG");
    assert.equal(created.active, true);
    assert.equal(created.active_goal.objective, "Port ultragoal to OMG");
    assert.match(created.handoff_text, /Active ultragoal/);

    const goalId = created.active_goal.id;
    const checkpointed = checkpointUltragoal(goalId, "MCP helper tests are running", "test checkpoint");
    assert.equal(checkpointed.active_goal.checkpoints.length, 1);
    assert.equal(checkpointed.active_goal.checkpoints[0].status, "checkpoint");

    const completed = completeUltragoal(goalId, "All ultragoal helper tests passed");
    assert.equal(completed.active, false);
    assert.equal(completed.active_goal, null);
    assert.equal(completed.goals[0].status, "completed");
  });

  it("fails closed for non-active goal checkpoint attempts", () => {
    const created = createUltragoalGoal("Keep active goal safe");
    const before = fs.readFileSync(getUltragoalLedgerPath(), "utf-8");

    assert.throws(() => checkpointUltragoal("not-active", "should not write"), /not the active ultragoal/);

    const after = fs.readFileSync(getUltragoalLedgerPath(), "utf-8");
    assert.equal(after, before);
    assert.equal(getUltragoalStatus().active_goal.id, created.active_goal.id);
  });

  it("fails closed for missing checkpoint evidence", () => {
    const created = getUltragoalStatus();
    const before = fs.readFileSync(getUltragoalLedgerPath(), "utf-8");

    assert.throws(() => checkpointUltragoal(created.active_goal.id, "  "), /evidence is required/i);

    const after = fs.readFileSync(getUltragoalLedgerPath(), "utf-8");
    assert.equal(after, before);
  });

  it("fails closed when the ultragoal ledger is malformed", () => {
    const ledgerPath = getUltragoalLedgerPath();
    const before = "{not valid json";
    fs.writeFileSync(ledgerPath, before);

    assert.throws(() => createUltragoalGoal("should fail"), /Malformed ultragoal ledger/);
    assert.equal(fs.readFileSync(ledgerPath, "utf-8"), before);
  });
});
