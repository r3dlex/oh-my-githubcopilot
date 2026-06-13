/**
 * Verify Skill Unit Tests
 */

import { describe, it, expect } from "vitest";
import type { SkillInput } from "../../src/skills/verify.mts";

describe("verify skill", () => {
  describe("module exports", () => {
    it("should export activate function", async () => {
      const mod = await import("../../src/skills/verify.mts");
      expect(typeof mod.activate).toBe("function");
    });

    it("should export deactivate function", async () => {
      const mod = await import("../../src/skills/verify.mts");
      expect(typeof mod.deactivate).toBe("function");
    });

    it("should export SkillInput interface", async () => {
      const mod = await import("../../src/skills/verify.mts");
      const input: mod.SkillInput = { trigger: "verify:", args: [] };
      expect(input.trigger).toBe("verify:");
    });

    it("should export SkillOutput interface", async () => {
      const mod = await import("../../src/skills/verify.mts");
      const output: mod.SkillOutput = { status: "ok", message: "ok" };
      expect(output.status).toBe("ok");
    });
  });

  describe("deactivate", () => {
    it("should not throw when called", async () => {
      const { deactivate } = await import("../../src/skills/verify.mts");
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("interface contracts", () => {
    it("activate should accept trigger and args", async () => {
      const { activate } = await import("../../src/skills/verify.mts");
      const input: SkillInput = { trigger: "verify:", args: ["--strict"] };
      expect(input.args).toHaveLength(1);
    });
  });
});
