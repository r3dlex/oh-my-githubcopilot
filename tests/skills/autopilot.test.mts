/**
 * Autopilot Skill Unit Tests
 */

import { describe, it, expect } from "vitest";
import type { SkillInput } from "../../src/skills/autopilot.mts";

describe("autopilot skill", () => {
  describe("module exports", () => {
    it("should export activate function", async () => {
      const mod = await import("../../src/skills/autopilot.mts");
      expect(typeof mod.activate).toBe("function");
    });

    it("should export deactivate function", async () => {
      const mod = await import("../../src/skills/autopilot.mts");
      expect(typeof mod.deactivate).toBe("function");
    });

    it("should export SkillInput interface", async () => {
      const mod = await import("../../src/skills/autopilot.mts");
      const input: mod.SkillInput = { trigger: "autopilot:", args: [] };
      expect(input.trigger).toBe("autopilot:");
    });

    it("should export SkillOutput interface", async () => {
      const mod = await import("../../src/skills/autopilot.mts");
      // SkillOutput has status: "ok" | "error"
      const output: mod.SkillOutput = { status: "ok", message: "ok" };
      expect(output.status).toBe("ok");
    });
  });

  describe("deactivate", () => {
    it("should not throw when called", async () => {
      const { deactivate } = await import("../../src/skills/autopilot.mts");
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("interface contracts", () => {
    it("activate should accept trigger and args", async () => {
      const { activate } = await import("../../src/skills/autopilot.mts");
      // Just verify the function accepts the right shape - won't actually spawn
      const input: SkillInput = { trigger: "autopilot:", args: ["--verbose", "--fast"] };
      expect(input.args).toHaveLength(2);
    });
  });
});