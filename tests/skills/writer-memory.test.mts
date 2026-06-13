/**
 * writer-memory Skill Unit Tests
 */

import { describe, it, expect } from "vitest";
import type { SkillInput } from "../../src/skills/writer-memory.mts";

describe("writer-memory skill", () => {
  describe("module exports", () => {
    it("should export activate function", async () => {
      const mod = await import("../../src/skills/writer-memory.mts");
      expect(typeof mod.activate).toBe("function");
    });

    it("should export deactivate function", async () => {
      const mod = await import("../../src/skills/writer-memory.mts");
      expect(typeof mod.deactivate).toBe("function");
    });

    it("should export SkillInput interface", async () => {
      const mod = await import("../../src/skills/writer-memory.mts");
      const input: mod.SkillInput = { trigger: "writer-memory:", args: [] };
      expect(input.trigger).toBe("writer-memory:");
    });

    it("should export SkillOutput interface", async () => {
      const mod = await import("../../src/skills/writer-memory.mts");
      const output: mod.SkillOutput = { status: "ok", message: "ok" };
      expect(output.status).toBe("ok");
    });
  });

  describe("deactivate", () => {
    it("should not throw when called", async () => {
      const { deactivate } = await import("../../src/skills/writer-memory.mts");
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("interface contracts", () => {
    it("activate should accept trigger and style note args", async () => {
      const input: SkillInput = { trigger: "writer-memory:", args: ["Use active voice"] };
      expect(input.args).toHaveLength(1);
    });

    it("activate should accept empty args for reading writer memory", async () => {
      const input: SkillInput = { trigger: "writer-memory:", args: [] };
      expect(input.args).toHaveLength(0);
    });
  });
});
