/**
 * Bulk tests for all spawn-based skills that share the same pattern:
 *   activate(input) → spawns a child process, resolves SkillOutput
 *   deactivate()    → no-op
 *
 * Strategy: make the mock child's .on() immediately invoke the callback
 * when the event key matches the pre-configured outcome. This avoids
 * async timing issues with dynamic imports.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSpawn = vi.fn();

vi.mock("child_process", () => ({
  spawn: mockSpawn,
}));

/** Returns a fake child that fires the close/error callback immediately
 *  when .on() is called with the matching event name. */
function makeChild(closeCode: number | null, errorMsg?: string) {
  return {
    on: vi.fn((event: string, cb: Function) => {
      if (errorMsg && event === "error") {
        cb(new Error(errorMsg));
      } else if (closeCode !== null && event === "close") {
        cb(closeCode);
      }
    }),
  };
}

beforeEach(() => {
  mockSpawn.mockClear();
});

const SPAWN_SKILLS = [
  "autopilot",
  "configure-notifications",
  "deep-interview",
  "ecomode",
  "hud",
  "learner",
  "note",
  "omp-plan",
  "omp-setup",
  "pipeline",
  "psm",
  "ralph",
  "release",
  // "setup" excluded — has top-level stdin-reading code that blocks on import
  "swarm",
  "swe-bench",
  "team",
  "trace",
  "ultrawork",
  "wiki",
] as const;

for (const skillName of SPAWN_SKILLS) {
  describe(`skill: ${skillName}`, () => {
    it("activate() resolves ok when child exits 0", async () => {
      mockSpawn.mockReturnValue(makeChild(0));
      const mod = await import(`../../src/skills/${skillName}.mts`);
      const result = await mod.activate({ trigger: `${skillName}:`, args: [] });
      expect(result.status).toBe("ok");
    });

    it("activate() resolves error when child exits non-zero", async () => {
      mockSpawn.mockReturnValue(makeChild(1));
      const mod = await import(`../../src/skills/${skillName}.mts`);
      const result = await mod.activate({ trigger: `${skillName}:`, args: ["--flag"] });
      expect(result.status).toBe("error");
    });

    it("activate() resolves error when spawn emits error", async () => {
      mockSpawn.mockReturnValue(makeChild(null, "ENOENT"));
      const mod = await import(`../../src/skills/${skillName}.mts`);
      const result = await mod.activate({ trigger: `${skillName}:`, args: [] });
      expect(result.status).toBe("error");
      expect(result.message).toContain("ENOENT");
    });

    it("deactivate() does not throw", async () => {
      const mod = await import(`../../src/skills/${skillName}.mts`);
      expect(() => mod.deactivate()).not.toThrow();
    });
  });
}
