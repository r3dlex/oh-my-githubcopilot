/**
 * omp doctor — installation and migration diagnostics.
 *
 * OMP 2.0 agent-parity migration check: scans the project's config files
 * (.github/copilot-instructions.md, AGENTS.md, .omg/ state) for stale agent
 * IDs that were renamed or dropped in 2.0 and prints suggested replacements.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

/** Stale agent ID → suggested replacement (OMP 2.0 agent parity). */
export const AGENT_MIGRATIONS: Record<string, string> = {
  explorer: "explore",
  simplifier: "code-simplifier",
  researcher: "document-specialist",
  reviewer: "code-reviewer",
  tester: "test-engineer",
  orchestrator: "top-level orchestration role (no longer a delegatable agent)",
};

export interface StaleAgentWarning {
  file: string;
  line: number;
  staleId: string;
  replacement: string;
  text: string;
}

// Matches @-mentions of stale agent IDs as whole words. The lookarounds keep
// hyphenated IDs intact: "@qa-tester", "@code-reviewer", "@security-reviewer"
// and "@code-simplifier" never match.
const STALE_AGENT_PATTERN = /(?<![\w-])@(explorer|simplifier|researcher|reviewer|tester|orchestrator)(?![\w-])/g;

/** Files scanned relative to the project root. */
const SCAN_FILES = [
  ".github/copilot-instructions.md",
  ".copilot/copilot-instructions.md",
  "AGENTS.md",
];

/** Directories scanned recursively (state dirs) relative to the project root. */
const SCAN_DIRS = [".omg"];

const SCANNABLE_EXTENSIONS = [".md", ".json", ".yml", ".yaml", ".txt"];
const MAX_SCAN_DEPTH = 3;

/** Scan a text blob for stale agent references. */
export function scanTextForStaleAgents(text: string, file: string): StaleAgentWarning[] {
  const warnings: StaleAgentWarning[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const match of line.matchAll(STALE_AGENT_PATTERN)) {
      const staleId = match[1];
      warnings.push({
        file,
        line: i + 1,
        staleId: `@${staleId}`,
        replacement: AGENT_MIGRATIONS[staleId],
        text: line.trim(),
      });
    }
  }
  return warnings;
}

function collectDirFiles(dir: string, depth: number): string[] {
  if (depth > MAX_SCAN_DEPTH) return [];
  const files: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    try {
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        files.push(...collectDirFiles(fullPath, depth + 1));
      } else if (SCANNABLE_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
        files.push(fullPath);
      }
    } catch {
      // Skip unreadable entries
    }
  }
  return files;
}

/** Scan the project's config files for stale agent IDs. */
export function scanProjectForStaleAgents(cwd: string): StaleAgentWarning[] {
  const targets: string[] = [];
  for (const file of SCAN_FILES) {
    const fullPath = join(cwd, file);
    if (existsSync(fullPath)) targets.push(fullPath);
  }
  for (const dir of SCAN_DIRS) {
    const fullPath = join(cwd, dir);
    if (existsSync(fullPath)) targets.push(...collectDirFiles(fullPath, 0));
  }

  const warnings: StaleAgentWarning[] = [];
  for (const target of targets) {
    try {
      const text = readFileSync(target, "utf-8");
      warnings.push(...scanTextForStaleAgents(text, relative(cwd, target)));
    } catch {
      // Skip unreadable files
    }
  }
  return warnings;
}

/** Run the doctor checks and print a report. Returns the number of warnings. */
export function runDoctor(cwd: string = process.cwd()): number {
  console.log("OMP Doctor — agent migration check (2.0)");
  console.log("");

  const warnings = scanProjectForStaleAgents(cwd);

  if (warnings.length === 0) {
    console.log("OK: no stale agent references found.");
    return 0;
  }

  console.log(`WARN: found ${warnings.length} stale agent reference(s):`);
  console.log("");
  for (const warning of warnings) {
    console.log(`  ${warning.file}:${warning.line} — ${warning.staleId} → ${warning.replacement}`);
    console.log(`    ${warning.text}`);
  }
  console.log("");
  console.log("Suggested replacements (OMP 2.0 agent parity):");
  for (const [staleId, replacement] of Object.entries(AGENT_MIGRATIONS)) {
    console.log(`  @${staleId} → ${replacement}`);
  }
  return warnings.length;
}
