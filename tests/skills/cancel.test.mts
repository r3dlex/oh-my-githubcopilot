/**
 * Cancel Skill Unit Tests
 */

import { describe, it, expect } from "vitest";
import type { SkillInput } from "../../src/skills/cancel.mts";

describe("cancel skill", () => {
  describe("module exports", () => {
    it("should export activate function", async () => {
      const mod = await import("../../src/skills/cancel.mts");
      expect(typeof mod.activate).toBe("function");
    });

    it("should export deactivate function", async () => {
      const mod = await import("../../src/skills/cancel.mts");
      expect(typeof mod.deactivate).toBe("function");
    });

    it("should export SkillInput interface", async () => {
      const mod = await import("../../src/skills/cancel.mts");
      const input: mod.SkillInput = { trigger: "cancel:", args: [] };
      expect(input.trigger).toBe("cancel:");
    });

    it("should export SkillOutput interface", async () => {
      const mod = await import("../../src/skills/cancel.mts");
      const output: mod.SkillOutput = { status: "ok", message: "cancelled" };
      expect(output.status).toBe("ok");
    });
  });

  describe("deactivate", () => {
    it("should not throw when called", async () => {
      const { deactivate } = await import("../../src/skills/cancel.mts");
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("interface contracts", () => {
    it("activate should accept trigger and args", async () => {
      const { activate } = await import("../../src/skills/cancel.mts");
      const input: SkillInput = { trigger: "cancel:", args: [] };
      expect(input.args).toHaveLength(0);
    });
  });
});
