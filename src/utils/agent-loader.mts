/**
 * Agent Loader
 * Loads and registers agent definitions from the agents directory.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parseAgentFile } from "./yaml-parser.mjs";

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  modelTier: "high" | "standard" | "fast";
  tools: string[];
  content: string;
}

const AGENTS_DIR = join(process.cwd(), "src", "agents");

let cache: Map<string, AgentDefinition> | null = null;

function loadAgentFile(filename: string): AgentDefinition | null {
  try {
    const filePath = join(AGENTS_DIR, filename);
    const content = readFileSync(filePath, "utf-8");
    const parsed = parseAgentFile(content);
    if (!parsed) return null;
    return {
      id: parsed.frontmatter.name,
      name: parsed.frontmatter.name,
      description: parsed.frontmatter.description || "",
      modelTier: parsed.frontmatter.model_tier || "standard",
      tools: parsed.frontmatter.tools || [],
      content: parsed.content,
    };
  } catch {
    return null;
  }
}

/**
 * Load all agents from the agents directory.
 */
export function loadAllAgents(): Map<string, AgentDefinition> {
  if (cache) return cache;
  cache = new Map();
  try {
    const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const agent = loadAgentFile(file);
      if (agent) cache.set(agent.id, agent);
    }
  } catch {
    // Directory may not exist
  }
  return cache;
}

/**
 * Get an agent by ID.
 */
export function getAgent(id: string): AgentDefinition | null {
  const agents = loadAllAgents();
  return agents.get(id) ?? null;
}

/**
 * Clear the agent cache (for testing).
 */
export function clearCache(): void {
  cache = null;
}