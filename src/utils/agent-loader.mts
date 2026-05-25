/**
 * Agent Loader
 * Loads and registers agent definitions from the agents directory.
 */

import { existsSync, readFileSync, readdirSync } from "fs";
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

const AGENTS_DIRS = [
  join(process.cwd(), "agents"),
  join(process.cwd(), "src", "agents"),
];

let cache: Map<string, AgentDefinition> | null = null;

function normalizeModelTier(modelTier: string | undefined, model: string | undefined): "high" | "standard" | "fast" {
  if (modelTier === "high" || modelTier === "standard" || modelTier === "fast") {
    return modelTier;
  }
  if (!model) return "standard";
  if (/haiku|mini|nano|fast/i.test(model)) return "fast";
  if (/opus|pro|gpt-5\.5|sonnet-4-6/i.test(model)) return "high";
  return "standard";
}

function loadAgentFile(dir: string, filename: string): AgentDefinition | null {
  try {
    const filePath = join(dir, filename);
    const content = readFileSync(filePath, "utf-8");
    const parsed = parseAgentFile(content);
    if (!parsed) return null;
    return {
      id: parsed.frontmatter.name,
      name: parsed.frontmatter.name,
      description: parsed.frontmatter.description || "",
      modelTier: normalizeModelTier(parsed.frontmatter.model_tier, parsed.frontmatter.model),
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
  for (const dir of AGENTS_DIRS) {
    if (!existsSync(dir)) continue;
    try {
      const files = readdirSync(dir).filter((f) => f.endsWith(".agent.md"));
      for (const file of files) {
        const agent = loadAgentFile(dir, file);
        if (agent) cache.set(agent.id, agent);
      }
      if (cache.size > 0) break;
    } catch {
      // Directory may not exist or may be unreadable
    }
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