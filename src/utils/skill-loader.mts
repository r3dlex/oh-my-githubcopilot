/**
 * Skill Loader
 * Lazy-loads skill definitions from the skills directory.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parseSkillFile } from "./yaml-parser.mjs";

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  trigger?: string;
  autoinvoke?: boolean;
  content: string;
}

const SKILL_DIRS = [
  "agents/skills",
  join(process.env["HOME"] || "", ".copilot", "skills"),
];

let cache: Map<string, SkillDefinition> | null = null;

function loadSkillFile(dir: string, filename: string): SkillDefinition | null {
  try {
    const filePath = join(dir, filename, "SKILL.md");
    const content = readFileSync(filePath, "utf-8");
    const parsed = parseSkillFile(content);
    if (!parsed) return null;
    return {
      id: filename,
      name: parsed.frontmatter.name || filename,
      description: parsed.frontmatter.description || "",
      trigger: parsed.frontmatter.trigger,
      autoinvoke: parsed.frontmatter.autoinvoke ?? false,
      content: parsed.content,
    };
  } catch {
    return null;
  }
}

/**
 * Load all skills from the discovery path.
 */
export function loadAllSkills(): Map<string, SkillDefinition> {
  if (cache) return cache;
  cache = new Map();
  for (const dir of SKILL_DIRS) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skill = loadSkillFile(dir, entry.name);
          if (skill) cache.set(skill.id, skill);
        }
      }
    } catch {
      // Directory may not exist, skip
    }
  }
  return cache;
}

/**
 * Get a skill by ID (lazy-loaded).
 */
export function getSkill(id: string): SkillDefinition | null {
  const skills = loadAllSkills();
  return skills.get(id) ?? null;
}

/**
 * Clear the skill cache (for testing).
 */
export function clearCache(): void {
  cache = null;
}