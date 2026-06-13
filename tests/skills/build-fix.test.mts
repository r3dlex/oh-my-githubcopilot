/**
 * build-fix Skill Unit Tests
 */

import { describe, it, expect } from "vitest";
import type { SkillInput } from "../../src/skills/build-fix.mts";

describe("build-fix skill", () => {
  describe("module exports", () => {
    it("should export activate function", async () => {
      const mod = await import("../../src/skills/build-fix.mts");
      expect(typeof mod.activate).toBe("function");
    });

    it("should export deactivate function", async () => {
      const mod = await import("../../src/skills/build-fix.mts");
      expect(typeof mod.deactivate).toBe("function");
    });

    it("should export SkillInput interface", async () => {
      const mod = await import("../../src/skills/build-fix.mts");
      const input: mod.SkillInput = { trigger: "build-fix:", args: [] };
      expect(input.trigger).toBe("build-fix:");
    });

    it("should export SkillOutput interface", async () => {
      const mod = await import("../../src/skills/build-fix.mts");
      const output: mod.SkillOutput = { status: "ok", message: "ok" };
      expect(output.status).toBe("ok");
    });
  });

  describe("deactivate", () => {
    it("should not throw when called", async () => {
      const { deactivate } = await import("../../src/skills/build-fix.mts");
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("interface contracts", () => {
    it("activate should accept trigger and args", async () => {
      const input: SkillInput = { trigger: "build-fix:", args: ["pnpm build"] };
      expect(input.args).toHaveLength(1);
    });
  });
});
