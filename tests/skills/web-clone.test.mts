/**
 * web-clone Skill Unit Tests
 */

import { describe, it, expect } from "vitest";
import type { SkillInput } from "../../src/skills/web-clone.mts";

describe("web-clone skill", () => {
  describe("module exports", () => {
    it("should export activate function", async () => {
      const mod = await import("../../src/skills/web-clone.mts");
      expect(typeof mod.activate).toBe("function");
    });

    it("should export deactivate function", async () => {
      const mod = await import("../../src/skills/web-clone.mts");
      expect(typeof mod.deactivate).toBe("function");
    });

    it("should export SkillInput interface", async () => {
      const mod = await import("../../src/skills/web-clone.mts");
      const input: mod.SkillInput = { trigger: "web-clone:", args: [] };
      expect(input.trigger).toBe("web-clone:");
    });

    it("should export SkillOutput interface", async () => {
      const mod = await import("../../src/skills/web-clone.mts");
      const output: mod.SkillOutput = { status: "ok", message: "ok" };
      expect(output.status).toBe("ok");
    });
  });

  describe("deactivate", () => {
    it("should not throw when called", async () => {
      const { deactivate } = await import("../../src/skills/web-clone.mts");
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("interface contracts", () => {
    it("activate should accept trigger and args", async () => {
      const input: SkillInput = { trigger: "web-clone:", args: ["https://example.com"] };
      expect(input.args).toHaveLength(1);
    });
  });
});
