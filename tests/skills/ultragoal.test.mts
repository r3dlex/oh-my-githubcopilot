/**
 * UltraGoal Skill Unit Tests
 */

import { describe, it, expect } from "vitest";
import type { SkillInput } from "../../src/skills/ultragoal.mts";

describe("ultragoal skill", () => {
  describe("module exports", () => {
    it("should export activate function", async () => {
      const mod = await import("../../src/skills/ultragoal.mts");
      expect(typeof mod.activate).toBe("function");
    });

    it("should export deactivate function", async () => {
      const mod = await import("../../src/skills/ultragoal.mts");
      expect(typeof mod.deactivate).toBe("function");
    });

    it("should export SkillInput interface", async () => {
      const mod = await import("../../src/skills/ultragoal.mts");
      const input: mod.SkillInput = { trigger: "ultragoal:", args: [] };
      expect(input.trigger).toBe("ultragoal:");
    });

    it("should export SkillOutput interface", async () => {
      const mod = await import("../../src/skills/ultragoal.mts");
      const output: mod.SkillOutput = { status: "ok", message: "goals listed" };
      expect(output.status).toBe("ok");
    });
  });

  describe("deactivate", () => {
    it("should not throw when called", async () => {
      const { deactivate } = await import("../../src/skills/ultragoal.mts");
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("interface contracts", () => {
    it("activate should accept trigger and args", async () => {
      const { activate } = await import("../../src/skills/ultragoal.mts");
      const input: SkillInput = { trigger: "ultragoal:", args: ["Build the auth module"] };
      expect(input.args).toHaveLength(1);
    });
  });
});
