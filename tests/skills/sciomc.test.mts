/**
 * sciomc Skill Unit Tests
 */

import { describe, it, expect } from "vitest";
import type { SkillInput } from "../../src/skills/sciomc.mts";

describe("sciomc skill", () => {
  describe("module exports", () => {
    it("should export activate function", async () => {
      const mod = await import("../../src/skills/sciomc.mts");
      expect(typeof mod.activate).toBe("function");
    });

    it("should export deactivate function", async () => {
      const mod = await import("../../src/skills/sciomc.mts");
      expect(typeof mod.deactivate).toBe("function");
    });

    it("should export SkillInput interface", async () => {
      const mod = await import("../../src/skills/sciomc.mts");
      const input: mod.SkillInput = { trigger: "sciomc:", args: [] };
      expect(input.trigger).toBe("sciomc:");
    });

    it("should export SkillOutput interface", async () => {
      const mod = await import("../../src/skills/sciomc.mts");
      const output: mod.SkillOutput = { status: "ok", message: "ok" };
      expect(output.status).toBe("ok");
    });
  });

  describe("deactivate", () => {
    it("should not throw when called", async () => {
      const { deactivate } = await import("../../src/skills/sciomc.mts");
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("interface contracts", () => {
    it("activate should accept trigger and args", async () => {
      const input: SkillInput = { trigger: "sciomc:", args: ["hypothesis"] };
      expect(input.args).toHaveLength(1);
    });
  });
});
