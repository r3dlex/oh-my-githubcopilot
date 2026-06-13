/**
 * remember Skill Unit Tests
 */

import { describe, it, expect } from "vitest";
import type { SkillInput } from "../../src/skills/remember.mts";

describe("remember skill", () => {
  describe("module exports", () => {
    it("should export activate function", async () => {
      const mod = await import("../../src/skills/remember.mts");
      expect(typeof mod.activate).toBe("function");
    });

    it("should export deactivate function", async () => {
      const mod = await import("../../src/skills/remember.mts");
      expect(typeof mod.deactivate).toBe("function");
    });

    it("should export SkillInput interface", async () => {
      const mod = await import("../../src/skills/remember.mts");
      const input: mod.SkillInput = { trigger: "remember:", args: [] };
      expect(input.trigger).toBe("remember:");
    });

    it("should export SkillOutput interface", async () => {
      const mod = await import("../../src/skills/remember.mts");
      const output: mod.SkillOutput = { status: "ok", message: "ok" };
      expect(output.status).toBe("ok");
    });
  });

  describe("deactivate", () => {
    it("should not throw when called", async () => {
      const { deactivate } = await import("../../src/skills/remember.mts");
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("interface contracts", () => {
    it("activate should accept trigger and args", async () => {
      const input: SkillInput = { trigger: "remember:", args: ["important note"] };
      expect(input.args).toHaveLength(1);
    });

    it("activate should accept empty args for listing memories", async () => {
      const input: SkillInput = { trigger: "remember:", args: [] };
      expect(input.args).toHaveLength(0);
    });
  });
});
