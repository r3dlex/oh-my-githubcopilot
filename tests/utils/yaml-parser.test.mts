/**
 * YAML Parser tests
 */

import { describe, it, expect } from "vitest";
import { parseFrontmatter, parseAgentFile, parseSkillFile } from "../../src/utils/yaml-parser.mts";

describe("YAML parser", () => {
  describe("parseFrontmatter", () => {
    it("should parse valid frontmatter", () => {
      const content = `---\nname: test-agent\ndescription: A test agent\nmodel_tier: standard\n---\nAgent content here.`;
      const result = parseFrontmatter<{ name: string }>(content);
      expect(result).not.toBeNull();
      expect(result?.frontmatter.name).toBe("test-agent");
      expect(result?.content).toBe("Agent content here.");
    });

    it("should return null for invalid frontmatter", () => {
      const content = "No frontmatter here";
      const result = parseFrontmatter(content);
      expect(result).toBeNull();
    });

    it("should return null for malformed YAML", () => {
      const content = `---\nname: test\n  invalid: yaml\n---\ncontent`;
      const result = parseFrontmatter(content);
      expect(result).toBeNull();
    });

    it("should handle frontmatter with trailing whitespace", () => {
      const content = `---\nname: test\n---\n   content   `;
      const result = parseFrontmatter(content);
      expect(result).not.toBeNull();
    });

    it("should handle multiline frontmatter", () => {
      const content = `---\nname: multi\ntools:\n  - Read\n  - Write\n  - Edit\n---\ncontent`;
      const result = parseFrontmatter<{ name: string; tools: string[] }>(content);
      expect(result?.frontmatter.tools).toEqual(["Read", "Write", "Edit"]);
    });
  });

  describe("parseAgentFile", () => {
    it("should parse agent frontmatter", () => {
      const content = `---\nname: executor\ndescription: Executes tasks\nmodel_tier: high\ntools:\n  - Read\n  - Write\n---\nExecutes code tasks.`;
      const result = parseAgentFile(content);
      expect(result).not.toBeNull();
      expect(result?.frontmatter.name).toBe("executor");
      expect(result?.frontmatter.model_tier).toBe("high");
    });

    it("should return null for content without frontmatter", () => {
      const result = parseAgentFile("Just plain content");
      expect(result).toBeNull();
    });
  });

  describe("parseSkillFile", () => {
    it("should parse skill frontmatter", () => {
      const content = `---\nname: autopilot\ndescription: Auto pilot mode\ntrigger: "autopilot:"\nautoinvoke: true\n---\nSkill description content.`;
      const result = parseSkillFile(content);
      expect(result).not.toBeNull();
      expect(result?.frontmatter.name).toBe("autopilot");
      expect(result?.frontmatter.trigger).toBe("autopilot:");
      expect(result?.frontmatter.autoinvoke).toBe(true);
    });

    it("should handle optional fields", () => {
      const content = `---\nname: simple-skill\ndescription: A simple skill\n---\ncontent`;
      const result = parseSkillFile(content);
      expect(result).not.toBeNull();
      expect(result?.frontmatter.trigger).toBeUndefined();
      expect(result?.frontmatter.autoinvoke).toBeUndefined();
    });

    it("should return null for content without frontmatter", () => {
      const result = parseSkillFile("Plain skill content");
      expect(result).toBeNull();
    });
  });
});