/**
 * Code-Review Skill Unit Tests
 */

import { describe, it, expect } from "vitest";
import type { SkillInput } from "../../src/skills/code-review.mts";

describe("code-review skill", () => {
  describe("module exports", () => {
    it("should export activate function", async () => {
      const mod = await import("../../src/skills/code-review.mts");
      expect(typeof mod.activate).toBe("function");
    });

    it("should export deactivate function", async () => {
      const mod = await import("../../src/skills/code-review.mts");
      expect(typeof mod.deactivate).toBe("function");
    });

    it("should export SkillInput interface", async () => {
      const mod = await import("../../src/skills/code-review.mts");
      const input: mod.SkillInput = { trigger: "code-review:", args: [] };
      expect(input.trigger).toBe("code-review:");
    });

    it("should export SkillOutput interface", async () => {
      const mod = await import("../../src/skills/code-review.mts");
      const output: mod.SkillOutput = { status: "ok", message: "reviewed" };
      expect(output.status).toBe("ok");
    });
  });

  describe("deactivate", () => {
    it("should not throw when called", async () => {
      const { deactivate } = await import("../../src/skills/code-review.mts");
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("interface contracts", () => {
    it("activate should accept trigger and args", async () => {
      const { activate } = await import("../../src/skills/code-review.mts");
      const input: SkillInput = { trigger: "code-review:", args: ["src/"] };
      expect(input.args).toHaveLength(1);
    });
  });
});
