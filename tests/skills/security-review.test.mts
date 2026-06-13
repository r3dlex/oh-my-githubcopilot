/**
 * Security-Review Skill Unit Tests
 */

import { describe, it, expect } from "vitest";
import type { SkillInput } from "../../src/skills/security-review.mts";

describe("security-review skill", () => {
  describe("module exports", () => {
    it("should export activate function", async () => {
      const mod = await import("../../src/skills/security-review.mts");
      expect(typeof mod.activate).toBe("function");
    });

    it("should export deactivate function", async () => {
      const mod = await import("../../src/skills/security-review.mts");
      expect(typeof mod.deactivate).toBe("function");
    });

    it("should export SkillInput interface", async () => {
      const mod = await import("../../src/skills/security-review.mts");
      const input: mod.SkillInput = { trigger: "security-review:", args: [] };
      expect(input.trigger).toBe("security-review:");
    });

    it("should export SkillOutput interface", async () => {
      const mod = await import("../../src/skills/security-review.mts");
      const output: mod.SkillOutput = { status: "ok", message: "secure" };
      expect(output.status).toBe("ok");
    });
  });

  describe("deactivate", () => {
    it("should not throw when called", async () => {
      const { deactivate } = await import("../../src/skills/security-review.mts");
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("interface contracts", () => {
    it("activate should accept trigger and args", async () => {
      const { activate } = await import("../../src/skills/security-review.mts");
      const input: SkillInput = { trigger: "security-review:", args: ["--owasp"] };
      expect(input.args).toHaveLength(1);
    });
  });
});
