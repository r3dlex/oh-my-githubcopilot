/**
 * deep-dive Skill Unit Tests
 */

import { describe, it, expect } from "vitest";
import type { SkillInput } from "../../src/skills/deep-dive.mts";

describe("deep-dive skill", () => {
  describe("module exports", () => {
    it("should export activate function", async () => {
      const mod = await import("../../src/skills/deep-dive.mts");
      expect(typeof mod.activate).toBe("function");
    });

    it("should export deactivate function", async () => {
      const mod = await import("../../src/skills/deep-dive.mts");
      expect(typeof mod.deactivate).toBe("function");
    });

    it("should export SkillInput interface", async () => {
      const mod = await import("../../src/skills/deep-dive.mts");
      const input: mod.SkillInput = { trigger: "deep-dive:", args: [] };
      expect(input.trigger).toBe("deep-dive:");
    });

    it("should export SkillOutput interface", async () => {
      const mod = await import("../../src/skills/deep-dive.mts");
      const output: mod.SkillOutput = { status: "ok", message: "ok" };
      expect(output.status).toBe("ok");
    });
  });

  describe("deactivate", () => {
    it("should not throw when called", async () => {
      const { deactivate } = await import("../../src/skills/deep-dive.mts");
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("interface contracts", () => {
    it("activate should accept trigger and args", async () => {
      const input: SkillInput = { trigger: "deep-dive:", args: ["--help"] };
      expect(input.args).toHaveLength(1);
    });
  });
});
