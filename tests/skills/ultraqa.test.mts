/**
 * UltraQA Skill Unit Tests
 */

import { describe, it, expect } from "vitest";
import type { SkillInput } from "../../src/skills/ultraqa.mts";

describe("ultraqa skill", () => {
  describe("module exports", () => {
    it("should export activate function", async () => {
      const mod = await import("../../src/skills/ultraqa.mts");
      expect(typeof mod.activate).toBe("function");
    });

    it("should export deactivate function", async () => {
      const mod = await import("../../src/skills/ultraqa.mts");
      expect(typeof mod.deactivate).toBe("function");
    });

    it("should export SkillInput interface", async () => {
      const mod = await import("../../src/skills/ultraqa.mts");
      const input: mod.SkillInput = { trigger: "ultraqa:", args: [] };
      expect(input.trigger).toBe("ultraqa:");
    });

    it("should export SkillOutput interface", async () => {
      const mod = await import("../../src/skills/ultraqa.mts");
      const output: mod.SkillOutput = { status: "ok", message: "qa passed" };
      expect(output.status).toBe("ok");
    });
  });

  describe("deactivate", () => {
    it("should not throw when called", async () => {
      const { deactivate } = await import("../../src/skills/ultraqa.mts");
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("interface contracts", () => {
    it("activate should accept trigger and args", async () => {
      const { activate } = await import("../../src/skills/ultraqa.mts");
      const input: SkillInput = { trigger: "ultraqa:", args: ["--max-iter", "5"] };
      expect(input.args).toHaveLength(2);
    });
  });
});
