/**
 * Real-bin end-to-end tests for the spawn-skill seam — no mocks.
 *
 * The boilerplate src/skills/<id>.mts modules (deleted by goal
 * githubcopilot-skill-spawn-seam) spawned `node bin/omp.mjs <id>` with a
 * cwd-relative path, and their tests mocked child_process.spawn and asserted
 * only the spawn command string — so 30 skill ids with no omp CLI case stayed
 * invisible to CI ("Unknown subcommand", exit 1).
 *
 * These tests run the REAL bin/omp.mjs (no mocks) and assert honest outcomes:
 * a served verb exits 0 with real output, a guidance-only verb exits 0 with
 * guidance pointing at the real skill surface, and an unserved verb exits 1
 * with "Unknown subcommand". They also pin the advertisement invariant:
 * src/index.mts's usage list lists exactly the verbs the switch serves.
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join, sep } from "path";
import { fileURLToPath } from "url";
import {
  runSkill,
  resolveBinPath,
  type SkillOutput,
} from "../../src/skills/spawn-skill.mts";

const INDEX_SRC = readFileSync(
  join(fileURLToPath(new URL(".", import.meta.url)), "../../src/index.mts"),
  "utf-8"
);

describe("spawn-skill seam (real bin/omp.mjs, no mocks)", () => {
  it("resolves the real bin path from the running module, not process.cwd()", () => {
    const binPath = resolveBinPath();
    expect(existsSync(binPath), `resolved bin path must exist: ${binPath}`).toBe(true);
    expect(binPath.endsWith(join("bin", "omp.mjs"))).toBe(true);
    expect(binPath).not.toBe(join("bin", "omp.mjs")); // absolute, never cwd-relative
  });

  it("runSkill('version') — served verb exits 0 with real output", async () => {
    const out = await runSkill("version");
    expect(out.status).toBe("ok");
    expect(out.message).toContain("oh-my-githubcopilot v");
  });

  it("runSkill('help') — served verb prints the real skill catalog", async () => {
    const out = await runSkill("help");
    expect(out.status).toBe("ok");
    expect(out.message).toContain("Total: 59 skills");
    expect(out.message).toContain("Usage: /<skill-id> [args]");
  });

  it("runSkill('code-review') — guidance-only verb exits 0 and points at the real surface", async () => {
    const out = await runSkill("code-review");
    expect(out.status).toBe("ok");
    expect(out.message).toContain("use /code-review");
  });

  it("runSkill('ralph') — unserved verb honestly fails with exit 1", async () => {
    const out = await runSkill("ralph");
    expect(out.status).toBe("error");
    expect(out.message).toContain("Unknown subcommand: ralph");
  });

  it("bin/omp.mjs directly: representative verbs run end-to-end", () => {
    const bin = resolveBinPath();
    const served = spawnSync(process.execPath, [bin, "help"], { encoding: "utf-8" });
    expect(served.status).toBe(0);
    expect(served.stdout).toContain("Total: 59 skills");

    const unserved = spawnSync(process.execPath, [bin, "ralph"], { encoding: "utf-8" });
    expect(unserved.status).toBe(1);
    expect(unserved.stderr).toContain("Unknown subcommand: ralph");
  });

  it("src/index.mts advertises exactly the verbs it serves", () => {
    const usageMatch = INDEX_SRC.match(/omp \[([^\]]+)\]/);
    expect(usageMatch, "printUsage verb list must exist in src/index.mts").not.toBeNull();
    const usageVerbs = (usageMatch as RegExpMatchArray)[1].split("|");
    const servedVerbs = [...INDEX_SRC.matchAll(/case "([^"]+)"/g)].map((m) => m[1]);
    expect(usageVerbs.sort()).toEqual(servedVerbs.slice().sort());
  });
});

// Type-level: the seam maps real outcomes to SkillOutput.
const _typeCheck: SkillOutput = { status: "ok", message: "" };
void _typeCheck;