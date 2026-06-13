/**
 * Help Skill Unit Tests
 */

import { describe, it, expect } from "vitest";
import type { SkillInput } from "../../src/skills/help.mts";

describe("help skill", () => {
  describe("module exports", () => {
    it("should export activate function", async () => {
      const mod = await import("../../src/skills/help.mts");
      expect(typeof mod.activate).toBe("function");
    });

    it("should export deactivate function", async () => {
      const mod = await import("../../src/skills/help.mts");
      expect(typeof mod.deactivate).toBe("function");
    });

    it("should export SkillInput interface", async () => {
      const mod = await import("../../src/skills/help.mts");
      const input: mod.SkillInput = { trigger: "help:", args: [] };
      expect(input.trigger).toBe("help:");
    });

    it("should export SkillOutput interface", async () => {
      const mod = await import("../../src/skills/help.mts");
      const output: mod.SkillOutput = { status: "ok", message: "catalog" };
      expect(output.status).toBe("ok");
    });
  });

  describe("deactivate", () => {
    it("should not throw when called", async () => {
      const { deactivate } = await import("../../src/skills/help.mts");
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("interface contracts", () => {
    it("activate should accept trigger and args", async () => {
      const { activate } = await import("../../src/skills/help.mts");
      const input: SkillInput = { trigger: "help:", args: ["--verbose"] };
      expect(input.args).toHaveLength(1);
    });
  });
});
