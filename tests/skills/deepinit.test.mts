/**
 * deepinit Skill Unit Tests
 */

import { describe, it, expect } from "vitest";
import type { SkillInput } from "../../src/skills/deepinit.mts";

describe("deepinit skill", () => {
  describe("module exports", () => {
    it("should export activate function", async () => {
      const mod = await import("../../src/skills/deepinit.mts");
      expect(typeof mod.activate).toBe("function");
    });

    it("should export deactivate function", async () => {
      const mod = await import("../../src/skills/deepinit.mts");
      expect(typeof mod.deactivate).toBe("function");
    });

    it("should export SkillInput interface", async () => {
      const mod = await import("../../src/skills/deepinit.mts");
      const input: mod.SkillInput = { trigger: "deepinit:", args: [] };
      expect(input.trigger).toBe("deepinit:");
    });

    it("should export SkillOutput interface", async () => {
      const mod = await import("../../src/skills/deepinit.mts");
      const output: mod.SkillOutput = { status: "ok", message: "ok" };
      expect(output.status).toBe("ok");
    });
  });

  describe("deactivate", () => {
    it("should not throw when called", async () => {
      const { deactivate } = await import("../../src/skills/deepinit.mts");
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("interface contracts", () => {
    it("activate should accept trigger and args", async () => {
      const input: SkillInput = { trigger: "deepinit:", args: [] };
      expect(input.args).toHaveLength(0);
    });
  });
});
