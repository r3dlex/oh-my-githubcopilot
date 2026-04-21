import * as vscode from "vscode";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { OmpStateAdapter } from "../state/adapter";
import type { AgentInfo } from "../state/reader";

const STATE_DIRECTORY_CANDIDATES = [join(".omx", "state"), join(".omp", "state")] as const;
const IGNORED_STATE_FILES = new Set([
  "notify-hook-state.json",
  "tmux-hook-state.json",
  "notify-fallback-state.json",
  "notify-fallback-authority-owner.json",
  "native-stop-state.json",
]);
const STATE_FILE_SUFFIX = "-state.json";

interface WorkflowSummary {
  file: string;
  label: string;
  active: boolean;
  phase?: string;
  iteration?: number;
  updatedAt?: string;
  description?: string;
}

export function registerTreeViews(
  context: vscode.ExtensionContext,
  workspace: vscode.WorkspaceFolder,
): void {
  const workflowProvider = new WorkflowTreeProvider(workspace);
  const agentProvider = new AgentTreeProvider(workspace);
  const taskProvider = new TaskTreeProvider();

  context.subscriptions.push(
    vscode.window.createTreeView("omp.workflows", { treeDataProvider: workflowProvider }),
    vscode.window.createTreeView("omp.agents", { treeDataProvider: agentProvider }),
    vscode.window.createTreeView("omp.tasks", { treeDataProvider: taskProvider }),
  );

  const refreshAll = (): void => {
    workflowProvider.refresh();
    agentProvider.refresh();
    taskProvider.refresh();
  };

  const watchers = [
    vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace, ".omc/**/*.json")),
    vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace, ".omx/**/*.json")),
    vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace, ".omp/**/*.json")),
  ];

  for (const watcher of watchers) {
    watcher.onDidChange(refreshAll);
    watcher.onDidCreate(refreshAll);
    watcher.onDidDelete(refreshAll);
    context.subscriptions.push(watcher);
  }
}

class WorkflowTreeProvider implements vscode.TreeDataProvider<WorkflowItem> {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<WorkflowItem | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeEmitter.event;
  private _debounceTimer: NodeJS.Timeout | undefined;

  constructor(private readonly workspace: vscode.WorkspaceFolder) {}

  refresh(): void {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this.onDidChangeEmitter.fire(undefined);
    }, 200);
  }

  getTreeItem(element: WorkflowItem): vscode.TreeItem {
    return element;
  }

  getChildren(): WorkflowItem[] {
    const workflows = readWorkflowStates(this.workspace.uri.fsPath);
    if (workflows.length === 0) {
      return [
        new WorkflowItem(
          "No workflow state detected",
          "Run OMP workflows to populate .omx/state",
          vscode.TreeItemCollapsibleState.None,
        ),
      ];
    }

    return workflows.map((workflow) => {
      const icon = workflow.active ? "$(sync~spin)" : "$(history)";
      const details = [
        workflow.active ? "active" : "inactive",
        workflow.phase,
        workflow.iteration !== undefined ? `iteration ${workflow.iteration}` : undefined,
      ].filter(Boolean).join(" · ");

      const item = new WorkflowItem(
        `${icon} ${workflow.label}`,
        details || workflow.file,
        vscode.TreeItemCollapsibleState.None,
      );
      item.tooltip = [workflow.file, workflow.description, workflow.updatedAt].filter(Boolean).join("\n");
      item.contextValue = workflow.active ? "workflow-active" : "workflow-inactive";
      return item;
    });
  }
}

class WorkflowItem extends vscode.TreeItem {
  constructor(
    label: string,
    description: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState);
    this.description = description;
  }
}

class AgentTreeProvider implements vscode.TreeDataProvider<AgentLeafItem> {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<AgentLeafItem | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeEmitter.event;
  private _debounceTimer: NodeJS.Timeout | undefined;
  private readonly adapter: OmpStateAdapter;

  constructor(private readonly workspace: vscode.WorkspaceFolder) {
    this.adapter = new OmpStateAdapter(workspace.uri.fsPath);
  }

  refresh(): void {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this.onDidChangeEmitter.fire(undefined);
    }, 200);
  }

  getTreeItem(element: AgentLeafItem): vscode.TreeItem {
    return element;
  }

  getChildren(): AgentLeafItem[] {
    const agents = this.adapter.getAgents();
    if (agents.length === 0) {
      return [new AgentLeafItem("No agents running", "Subagent data will appear when OMP workflows are active")];
    }
    return agents.map((agent) => agentToItem(agent));
  }
}

function agentToItem(agent: AgentInfo): AgentLeafItem {
  let icon: string;
  if (agent.status === "running") {
    icon = "$(sync~spin)";
  } else if (agent.status === "completed") {
    icon = "$(check)";
  } else if (agent.status === "failed") {
    icon = "$(error)";
  } else {
    icon = "$(circle-outline)";
  }

  const label = `${icon} ${agent.type}`;
  const description = [agent.teamName, agent.status].filter(Boolean).join(" · ");
  return new AgentLeafItem(label, description);
}

class AgentLeafItem extends vscode.TreeItem {
  constructor(label: string, description: string, filePath?: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.iconPath = new vscode.ThemeIcon("person");
    if (filePath) {
      const uri = vscode.Uri.file(filePath);
      this.resourceUri = uri;
      this.command = {
        command: "vscode.open",
        title: "Open agent file",
        arguments: [uri],
      };
    }
  }
}

class TaskTreeProvider implements vscode.TreeDataProvider<TaskItem> {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<TaskItem | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeEmitter.event;
  private _debounceTimer: NodeJS.Timeout | undefined;

  refresh(): void {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this.onDidChangeEmitter.fire(undefined);
    }, 200);
  }

  getTreeItem(element: TaskItem): vscode.TreeItem {
    return element;
  }

  getChildren(): TaskItem[] {
    return [new TaskItem("No task data", "Tasks are tracked via GitHub Copilot native tools")];
  }
}

class TaskItem extends vscode.TreeItem {
  constructor(label: string, description: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.iconPath = new vscode.ThemeIcon("checklist");
  }
}

function readWorkflowStates(workspaceRoot: string): WorkflowSummary[] {
  const stateDirectories = STATE_DIRECTORY_CANDIDATES
    .map((relativePath) => join(workspaceRoot, relativePath))
    .filter(existsSync);

  const workflows: WorkflowSummary[] = [];
  for (const stateDirectory of stateDirectories) {
    for (const filePath of listStateFiles(stateDirectory)) {
      const summary = parseWorkflowState(workspaceRoot, filePath);
      if (summary) {
        workflows.push(summary);
      }
    }
  }

  return workflows.sort((left, right) => {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }

    if (left.updatedAt && right.updatedAt) {
      return right.updatedAt.localeCompare(left.updatedAt);
    }

    return left.label.localeCompare(right.label);
  });
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

function parseWorkflowState(workspaceRoot: string, filePath: string): WorkflowSummary | undefined {
  try {
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
    const label = asString(raw.mode) ?? asString(raw.skill);
    if (!label) {
      return undefined;
    }

    return {
      file: relative(workspaceRoot, filePath),
      label,
      active: Boolean(raw.active),
      phase: asString(raw.current_phase) ?? asString(raw.phase),
      iteration: typeof raw.iteration === "number" ? raw.iteration : undefined,
      updatedAt: asString(raw.updated_at),
      description: asString(raw.task_description),
    };
  } catch {
    return undefined;
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

