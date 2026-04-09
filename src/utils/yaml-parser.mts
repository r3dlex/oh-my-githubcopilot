/**
 * YAML Parser
 * Parses YAML frontmatter from agent and skill files.
 */

import { parse as parseYaml } from "yaml";

export interface AgentFrontmatter {
  name: string;
  description: string;
  model_tier: "high" | "standard" | "fast";
  tools: string[];
}

export interface SkillFrontmatter {
  name: string;
  description: string;
  trigger?: string;
  autoinvoke?: boolean;
}

export interface ParsedFile<T> {
  frontmatter: T;
  content: string;
}

/**
 * Parse YAML frontmatter from a file string.
 */
export function parseFrontmatter<T>(fileContent: string): ParsedFile<T> | null {
  const match = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  try {
    const frontmatter = parseYaml(match[1]) as T;
    const content = match[2].trim();
    return { frontmatter, content };
  } catch {
    return null;
  }
}

/**
 * Parse an agent file and extract frontmatter + body.
 */
export function parseAgentFile(content: string): ParsedFile<AgentFrontmatter> | null {
  return parseFrontmatter<AgentFrontmatter>(content);
}

/**
 * Parse a skill file and extract frontmatter + body.
 */
export function parseSkillFile(content: string): ParsedFile<SkillFrontmatter> | null {
  return parseFrontmatter<SkillFrontmatter>(content);
}