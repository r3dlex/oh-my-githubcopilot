import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { ImportResult } from "./omc-importer.js";

interface JsonlLine {
  type?: string;
  message?: {
    role?: string;
    content?: string | Array<{
      type?: string;
      text?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
  };
  timestamp?: string;
  sessionId?: string;
  uuid?: string;
  cwd?: string;
}

/**
 * Encode a workspace path the way Claude Code does for ~/.claude/projects/.
 * Replaces path separators with dashes.
 */
export function encodeProjectPath(workspacePath: string): string {
  return workspacePath.replace(/\//g, "-");
}

/**
 * Find the Claude Code project directory for a given workspace.
 */
function getClaudeProjectDir(workspaceRoot: string): string | null {
  const encoded = encodeProjectPath(workspaceRoot);
  const claudeDir = path.join(os.homedir(), ".claude", "projects", encoded);
  if (fs.existsSync(claudeDir)) return claudeDir;
  return null;
}

/**
 * Find the most recent JSONL session file in a Claude Code project directory.
 */
function findLatestJsonl(projectDir: string): { path: string; mtime: Date; sessionId: string } | null {
  const files = fs.readdirSync(projectDir).filter((f) => f.endsWith(".jsonl"));
  if (files.length === 0) return null;

  let latest: { path: string; mtime: Date; sessionId: string } | null = null;

  for (const file of files) {
    const fullPath = path.join(projectDir, file);
    const stat = fs.statSync(fullPath);
    if (!latest || stat.mtimeMs > latest.mtime.getTime()) {
      latest = {
        path: fullPath,
        mtime: stat.mtime,
        sessionId: file.replace(".jsonl", ""),
      };
    }
  }

  return latest;
}

/**
 * Parse the last N lines of a JSONL file.
 * Reads from the end of file for efficiency.
 */
function readLastLines(filePath: string, maxLines: number): string[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  return lines.slice(-maxLines);
}

/**
 * Parse a single JSONL line safely.
 */
function parseJsonlLine(line: string): JsonlLine | null {
  try {
    return JSON.parse(line) as JsonlLine;
  } catch {
    return null;
  }
}

/**
 * Extract modified files from tool_use blocks.
 * Looks for Write, Edit, MultiEdit tool calls with file_path / filePath.
 */
function extractModifiedFiles(entries: JsonlLine[]): string[] {
  const files = new Set<string>();
  const editTools = new Set(["Write", "Edit", "MultiEdit", "write", "edit", "multi_edit"]);

  for (const entry of entries) {
    const content = entry.message?.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (block.type !== "tool_use") continue;
      if (!block.name || !editTools.has(block.name)) continue;

      const input = block.input;
      if (!input) continue;

      const filePath = (input.file_path ?? input.filePath ?? input.path) as string | undefined;
      if (filePath && typeof filePath === "string") {
        files.add(filePath);
      }
    }
  }

  return Array.from(files);
}

/**
 * Extract the last user prompt from parsed entries.
 */
function extractLastUserPrompt(entries: JsonlLine[]): string | null {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    const msg = entry.message;
    if (!msg || msg.role !== "user") continue;

    if (typeof msg.content === "string") {
      // Skip task-notification system messages
      if (msg.content.includes("<task-notification>")) continue;
      return msg.content;
    }

    if (Array.isArray(msg.content)) {
      const textBlock = msg.content.find((b) => b.type === "text" && b.text);
      if (textBlock?.text && !textBlock.text.includes("<task-notification>")) {
        return textBlock.text;
      }
    }
  }

  return null;
}

/**
 * Extract the last assistant summary from parsed entries.
 */
function extractLastAssistantMessage(entries: JsonlLine[]): string | null {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    const msg = entry.message;
    if (!msg || msg.role !== "assistant") continue;

    if (typeof msg.content === "string") return msg.content;

    if (Array.isArray(msg.content)) {
      const textBlocks = msg.content
        .filter((b) => b.type === "text" && b.text)
        .map((b) => b.text!)
        .join("\n");
      if (textBlocks) return textBlocks;
    }
  }

  return null;
}

/**
 * Detect if a Claude Code session exists for this workspace.
 */
export function detectClaudeSession(workspaceRoot: string): {
  exists: boolean;
  mtime: string | null;
  session_id: string | null;
  details: string;
} {
  const projectDir = getClaudeProjectDir(workspaceRoot);
  if (!projectDir) return { exists: false, mtime: null, session_id: null, details: "" };

  const latest = findLatestJsonl(projectDir);
  if (!latest) return { exists: false, mtime: null, session_id: null, details: "" };

  return {
    exists: true,
    mtime: latest.mtime.toISOString(),
    session_id: latest.sessionId,
    details: `Claude Code session ${latest.sessionId} (modified ${latest.mtime.toISOString()})`,
  };
}

/**
 * Import a Claude Code JSONL session into OMG checkpoint format.
 * This is a lossy import — extracts user intent, modified files, and summary.
 */
export function importClaudeSession(workspaceRoot: string): ImportResult {
  const projectDir = getClaudeProjectDir(workspaceRoot);
  if (!projectDir) {
    return {
      source: "claude-code",
      imported_files: [],
      conflicts: [],
      summary: "No Claude Code session found for this workspace",
      session_id: null,
      timestamp: new Date().toISOString(),
    };
  }

  const latest = findLatestJsonl(projectDir);
  if (!latest) {
    return {
      source: "claude-code",
      imported_files: [],
      conflicts: [],
      summary: "No JSONL session files found",
      session_id: null,
      timestamp: new Date().toISOString(),
    };
  }

  // Parse last 50 lines
  const rawLines = readLastLines(latest.path, 50);
  const entries = rawLines.map(parseJsonlLine).filter((e): e is JsonlLine => e !== null);

  // Extract data
  const modifiedFiles = extractModifiedFiles(entries);
  const lastUserPrompt = extractLastUserPrompt(entries);
  const lastAssistantMsg = extractLastAssistantMessage(entries);

  // Build summary with full prompt (Option B: full content, chmod 0600)
  let summary = `Claude Code session ${latest.sessionId}`;
  if (lastUserPrompt) {
    summary += `\n\nLast user prompt:\n${lastUserPrompt}`;
  }
  if (lastAssistantMsg) {
    const truncated = lastAssistantMsg.length > 2000
      ? lastAssistantMsg.slice(0, 2000) + "..."
      : lastAssistantMsg;
    summary += `\n\nLast assistant response:\n${truncated}`;
  }
  if (modifiedFiles.length > 0) {
    summary += `\n\nModified files (${modifiedFiles.length}):\n${modifiedFiles.join("\n")}`;
  }

  return {
    source: "claude-code",
    imported_files: modifiedFiles,
    conflicts: [],
    summary,
    session_id: latest.sessionId,
    timestamp: latest.mtime.toISOString(),
  };
}
