import { mkdtemp, mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AGENT_MIGRATIONS,
  runDoctor,
  scanTextForStaleAgents,
  scanProjectForStaleAgents,
} from "../../src/cli/doctor.mts";

describe("doctor agent migration check", () => {
  describe("AGENT_MIGRATIONS mapping", () => {
    it("maps renamed agents to their new IDs", () => {
      expect(AGENT_MIGRATIONS.explorer).toBe("explore");
      expect(AGENT_MIGRATIONS.simplifier).toBe("code-simplifier");
    });

    it("maps dropped agents to their successors", () => {
      expect(AGENT_MIGRATIONS.researcher).toBe("document-specialist");
      expect(AGENT_MIGRATIONS.reviewer).toBe("code-reviewer");
      expect(AGENT_MIGRATIONS.tester).toBe("test-engineer");
    });

    it("maps orchestrator to the top-level role (not a delegatable agent)", () => {
      expect(AGENT_MIGRATIONS.orchestrator).toContain("no longer a delegatable agent");
    });

    it("covers exactly the six stale IDs", () => {
      expect(Object.keys(AGENT_MIGRATIONS).sort()).toEqual([
        "explorer",
        "orchestrator",
        "researcher",
        "reviewer",
        "simplifier",
        "tester",
      ]);
    });
  });

  describe("scanTextForStaleAgents", () => {
    it("detects stale @-mentions with line numbers and replacements", () => {
      const text = "Route reviews to @reviewer.\nDelegate research to @researcher.";
      const warnings = scanTextForStaleAgents(text, "AGENTS.md");
      expect(warnings).toHaveLength(2);
      expect(warnings[0]).toMatchObject({
        file: "AGENTS.md",
        line: 1,
        staleId: "@reviewer",
        replacement: "code-reviewer",
      });
      expect(warnings[1]).toMatchObject({
        line: 2,
        staleId: "@researcher",
        replacement: "document-specialist",
      });
    });

    it("detects @explorer, @simplifier, @tester, and @orchestrator", () => {
      const text = "@explorer @simplifier @tester @orchestrator";
      const staleIds = scanTextForStaleAgents(text, "x.md").map((w) => w.staleId);
      expect(staleIds).toEqual(["@explorer", "@simplifier", "@tester", "@orchestrator"]);
    });

    it("does not flag current hyphenated agent IDs containing stale substrings", () => {
      const text = "@code-reviewer @security-reviewer @qa-tester @code-simplifier @test-engineer";
      expect(scanTextForStaleAgents(text, "x.md")).toHaveLength(0);
    });

    it("does not flag prose without @-mentions", () => {
      const text = "The reviewer checks the tester output before the orchestrator verifies.";
      expect(scanTextForStaleAgents(text, "x.md")).toHaveLength(0);
    });

    it("flags multiple stale mentions on the same line", () => {
      const warnings = scanTextForStaleAgents("@tester and @reviewer pair up", "x.md");
      expect(warnings).toHaveLength(2);
      expect(warnings.every((w) => w.line === 1)).toBe(true);
    });
  });

  describe("scanProjectForStaleAgents", () => {
    let projectDir: string;

    beforeEach(async () => {
      projectDir = await mkdtemp(join(tmpdir(), "omp-doctor-"));
    });

    afterEach(async () => {
      await rm(projectDir, { recursive: true, force: true });
    });

    it("scans .github/copilot-instructions.md, AGENTS.md, and .omg/ state", async () => {
      await mkdir(join(projectDir, ".github"), { recursive: true });
      await writeFile(
        join(projectDir, ".github", "copilot-instructions.md"),
        "Send reviews to @reviewer."
      );
      await writeFile(join(projectDir, "AGENTS.md"), "Use @explorer for surveys.");
      await mkdir(join(projectDir, ".omg", "state"), { recursive: true });
      await writeFile(
        join(projectDir, ".omg", "state", "team.json"),
        JSON.stringify({ delegate: "@tester" })
      );

      const warnings = scanProjectForStaleAgents(projectDir);
      const staleIds = warnings.map((w) => w.staleId).sort();
      expect(staleIds).toEqual(["@explorer", "@reviewer", "@tester"]);
    });

    it("returns no warnings for a clean project", async () => {
      await writeFile(join(projectDir, "AGENTS.md"), "Use @explore and @code-reviewer.");
      expect(scanProjectForStaleAgents(projectDir)).toHaveLength(0);
    });

    it("returns no warnings when scan targets do not exist", () => {
      expect(scanProjectForStaleAgents(projectDir)).toHaveLength(0);
    });
  });

  describe("runDoctor", () => {
    let projectDir: string;

    beforeEach(async () => {
      projectDir = await mkdtemp(join(tmpdir(), "omp-doctor-run-"));
      vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(async () => {
      vi.restoreAllMocks();
      await rm(projectDir, { recursive: true, force: true });
    });

    it("returns 0 for a clean project", async () => {
      await writeFile(join(projectDir, "AGENTS.md"), "Use @explore and @code-reviewer.");
      expect(runDoctor(projectDir)).toBe(0);
    });

    it("returns the warning count when stale references are found", async () => {
      await writeFile(join(projectDir, "AGENTS.md"), "Use @reviewer.\nAlso @tester.");
      expect(runDoctor(projectDir)).toBe(2);
    });
  });
});
