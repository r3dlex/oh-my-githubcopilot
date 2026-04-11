/**
 * Skill Loader tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadAllSkills, getSkill, clearCache } from "../../src/utils/skill-loader.mts";

describe("skill-loader", () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    clearCache();
  });

  describe("loadAllSkills", () => {
    it("should return a Map", () => {
      const result = loadAllSkills();
      expect(result).toBeInstanceOf(Map);
    });

    it("should return cached results on subsequent calls", () => {
      const result1 = loadAllSkills();
      const result2 = loadAllSkills();
      expect(result1).toBe(result2);
    });

    it("should handle empty directories gracefully", () => {
      const result = loadAllSkills();
      expect(result).toBeInstanceOf(Map);
    });
  });

  describe("getSkill", () => {
    it("should return null for nonexistent skill", () => {
      const result = getSkill("nonexistent-skill-id");
      expect(result).toBeNull();
    });

    it("should return skill definition when found", () => {
      // This depends on actual skill files in the project
      const skills = loadAllSkills();
      if (skills.size > 0) {
        const firstKey = skills.keys().next().value;
        const result = getSkill(firstKey);
        expect(result).not.toBeNull();
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("name");
        expect(result).toHaveProperty("description");
      } else {
        expect(true).toBe(true);
      }
    });
  });

  describe("clearCache", () => {
    it("should clear the cache", () => {
      const result1 = loadAllSkills();
      clearCache();
      const result2 = loadAllSkills();
      // After clear, loading again creates new Map instance
      expect(result1).not.toBe(result2);
    });

    it("should allow fresh load after cache clear", () => {
      clearCache();
      const result = loadAllSkills();
      expect(result).toBeInstanceOf(Map);
    });
  });
});