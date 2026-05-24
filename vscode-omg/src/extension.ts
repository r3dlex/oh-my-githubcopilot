import * as vscode from 'vscode';
import { registerCommands } from './commands/initialize';
import { registerClearStateCommand } from './commands/clear-state';
import { registerHealthCheckCommand } from './commands/health-check';
import { registerMcpProvider } from './mcp/provider';
import { createStatusBar } from './ui/status-bar';
import { registerTreeViews } from './ui/tree-view';
import { checkExternalSessions, registerResumeExternalCommand } from './commands/resume-external';
import { registerPushExternalCommand } from './commands/push-external';

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('OMG');
  outputChannel.appendLine('oh-my-githubcopilot (OMG) extension activated');

  // Register all commands (always available, even in non-OMG workspaces for init)
  registerCommands(context, outputChannel);
  registerClearStateCommand(context, outputChannel);
  registerHealthCheckCommand(context, outputChannel);
  registerResumeExternalCommand(context, outputChannel);
  registerPushExternalCommand(context, outputChannel);

  // Only start background features in OMG-enabled, trusted workspaces
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (ws) {
    // Tree views always register so the sidebar panel is visible
    registerTreeViews(context, ws);

    if (vscode.workspace.isTrusted) {
      startBackgroundFeatures(context, ws, outputChannel);
    }
  }

  // If workspace becomes trusted later, start background features
  context.subscriptions.push(
    vscode.workspace.onDidGrantWorkspaceTrust(() => {
      const ws = vscode.workspace.workspaceFolders?.[0];
      if (ws) {
        startBackgroundFeatures(context, ws, outputChannel);
      }
    })
  );
}

function startBackgroundFeatures(
  context: vscode.ExtensionContext,
  ws: vscode.WorkspaceFolder,
  outputChannel: vscode.OutputChannel,
) {
  const config = vscode.workspace.getConfiguration('omg');

  // Register MCP server provider
  if (config.get<boolean>('autoStartMcp', true)) {
    registerMcpProvider(context, ws, outputChannel);
  }

  // Status bar
  if (config.get<boolean>('showStatusBar', true)) {
    createStatusBar(context, ws);
  }

  // External session detection (once at activation)
  checkExternalSessions(context, ws, outputChannel);
}

export function deactivate() {
  // Cleanup handled by disposables in context.subscriptions
}
