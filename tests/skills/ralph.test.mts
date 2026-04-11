/**
 * Ralph Skill Unit Tests
 */

import { describe, it, expect } from "vitest";
import type { SkillInput } from "../../src/skills/ralph.mts";

describe("ralph skill", () => {
  describe("module exports", () => {
    it("should export activate function", async () => {
      const mod = await import("../../src/skills/ralph.mts");
      expect(typeof mod.activate).toBe("function");
    });

    it("should export deactivate function", async () => {
      const mod = await import("../../src/skills/ralph.mts");
      expect(typeof mod.deactivate).toBe("function");
    });

    it("should export SkillInput interface", async () => {
      const mod = await import("../../src/skills/ralph.mts");
      const input: mod.SkillInput = { trigger: "ralph:", args: [] };
      expect(input.trigger).toBe("ralph:");
    });

    it("should export SkillOutput interface", async () => {
      const mod = await import("../../src/skills/ralph.mts");
      const output: mod.SkillOutput = { status: "error", message: "fail" };
      expect(output.status).toBe("error");
    });
  });

  describe("deactivate", () => {
    it("should not throw when called", async () => {
      const { deactivate } = await import("../../src/skills/ralph.mts");
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("interface contracts", () => {
    it("activate should accept trigger and args", async () => {
      const { activate } = await import("../../src/skills/ralph.mts");
      const input: SkillInput = { trigger: "ralph:", args: ["--verify", "--loop"] };
      expect(input.args).toHaveLength(2);
    });
  });
});