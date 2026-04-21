import * as vscode from "vscode";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OmpStateAdapter } from "../state/adapter";

const STATE_DIRECTORY_CANDIDATES = [join(".omx", "state"), join(".omp", "state")] as const;
const STATE_FILE_SUFFIX = "-state.json";
const IGNORED_STATE_FILES = new Set([
  "notify-hook-state.json",
  "tmux-hook-state.json",
  "notify-fallback-state.json",
  "notify-fallback-authority-owner.json",
  "native-stop-state.json",
]);

interface WorkflowStateSummary {
  label: string;
  active: boolean;
  phase?: string;
}

export function createStatusBar(
  context: vscode.ExtensionContext,
  workspace: vscode.WorkspaceFolder,
): void {
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  statusBar.command = "omp.showStatus";
  statusBar.tooltip = "OMP workflow status — click for details";
  context.subscriptions.push(statusBar);

  let debounceTimer: NodeJS.Timeout | undefined;
  const update = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => updateStatusBar(statusBar, workspace), 200);
  };
  updateStatusBar(statusBar, workspace);

  const watchers = [
    vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace, ".omc/state/*-state.json")),
    vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace, ".omc/state/subagent-tracking.json")),
    vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace, ".omx/**/*.json")),
    vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace, ".omp/**/*.json")),
  ];

  for (const watcher of watchers) {
    watcher.onDidChange(update);
    watcher.onDidCreate(update);
    watcher.onDidDelete(update);
    context.subscriptions.push(watcher);
  }

  context.subscriptions.push(vscode.workspace.onDidGrantWorkspaceTrust(update));
}

function updateStatusBar(statusBar: vscode.StatusBarItem, workspace: vscode.WorkspaceFolder): void {
  if (!vscode.workspace.isTrusted) {
    statusBar.text = "$(shield) OMP: workspace untrusted";
    statusBar.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    statusBar.tooltip = "Trust this workspace to enable OMP background features and MCP registration.";
    statusBar.show();
    return;
  }

  const adapter = new OmpStateAdapter(workspace.uri.fsPath);
  const runningAgents = adapter.getAgents().filter((a) => a.status === "running");
  const agentSuffix = runningAgents.length > 0 ? ` [${runningAgents.length} agents]` : "";

  const active = readWorkflowStates(workspace.uri.fsPath).filter((workflow) => workflow.active);
  if (active.length === 0) {
    statusBar.text = `$(zap) OMP: idle${agentSuffix}`;
    statusBar.backgroundColor = undefined;
    statusBar.tooltip = "OMP is installed, but no active workflows were found.";
    statusBar.show();
    return;
  }

  if (active.length === 1) {
    const [workflow] = active;
    const phase = workflow.phase ? ` [${workflow.phase}]` : "";
    statusBar.text = `$(sync~spin) OMP: ${workflow.label}${phase}${agentSuffix}`;
  } else {
    statusBar.text = `$(sync~spin) OMP: ${active.length} active${agentSuffix}`;
  }

  statusBar.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
  statusBar.tooltip = active.map((workflow) => workflow.phase ? `${workflow.label} — ${workflow.phase}` : workflow.label).join("\n");
  statusBar.show();
}

function readWorkflowStates(workspaceRoot: string): WorkflowStateSummary[] {
  return STATE_DIRECTORY_CANDIDATES
    .map((relativePath) => join(workspaceRoot, relativePath))
    .filter(existsSync)
    .flatMap((stateDirectory) => listStateFiles(stateDirectory))
    .map(parseWorkflowState)
    .filter((value): value is WorkflowStateSummary => value !== undefined);
}

function listStateFiles(stateDirectory: string): string[] {
  const directFiles = readdirSync(stateDirectory)
    .filter((entry) => entry.endsWith(STATE_FILE_SUFFIX) && !IGNORED_STATE_FILES.has(entry))
    .map((entry) => join(stateDirectory, entry));

  const sessionsDirectory = join(stateDirectory, "sessions");
  if (!existsSync(sessionsDirectory)) {
    return directFiles;
  }

  const sessionFiles = readdirSync(sessionsDirectory).flatMap((sessionId) => {
    const sessionDirectory = join(sessionsDirectory, sessionId);
    if (!existsSync(sessionDirectory)) {
      return [];
    }

    return readdirSync(sessionDirectory)
      .filter((entry) => entry.endsWith(STATE_FILE_SUFFIX) && !IGNORED_STATE_FILES.has(entry))
      .map((entry) => join(sessionDirectory, entry));
  });

  return [...directFiles, ...sessionFiles];
}

function parseWorkflowState(filePath: string): WorkflowStateSummary | undefined {
  try {
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
    const label = typeof raw.mode === "string" ? raw.mode : typeof raw.skill === "string" ? raw.skill : undefined;
    if (!label) {
      return undefined;
    }

    return {
      label,
      active: Boolean(raw.active),
      phase: typeof raw.current_phase === "string" ? raw.current_phase : typeof raw.phase === "string" ? raw.phase : undefined,
    };
  } catch {
    return undefined;
  }
}
