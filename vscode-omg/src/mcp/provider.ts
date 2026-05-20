import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function registerMcpProvider(
  context: vscode.ExtensionContext,
  ws: vscode.WorkspaceFolder,
  outputChannel: vscode.OutputChannel,
) {
  // Check if the registerMcpServerDefinitionProvider API is available
  if (typeof vscode.lm?.registerMcpServerDefinitionProvider !== 'function') {
    outputChannel.appendLine('OMG: MCP server definition provider API not available. Falling back to static configuration.');
    ensureStaticMcpConfig(ws, outputChannel);
    return;
  }

  const disposable = vscode.lm.registerMcpServerDefinitionProvider('omgMcpProvider', {
    provideMcpServerDefinitions() {
      if (!vscode.workspace.isTrusted) {
        return [];
      }

      const serverDist = path.join(ws.uri.fsPath, 'mcp-server', 'dist', 'index.js');
      if (!fs.existsSync(serverDist)) {
        // Trigger auto-build asynchronously
        autoBuildMcpServer(ws, outputChannel);
        return [];
      }

      return [
        new vscode.McpStdioServerDefinition(
          'OMG Workflow',
          'node',
          [serverDist],
          { WORKSPACE_ROOT: ws.uri.fsPath },
        ),
      ];
    },
  });

  context.subscriptions.push(disposable);
  outputChannel.appendLine('OMG: MCP server provider registered');

  // Always ensure a static mcp.json exists as a safety net.
  // The dynamic provider and static config coexist fine; VS Code deduplicates them.
  // This prevents tools from disappearing due to extension activation race conditions
  // where Copilot Chat finishes MCP enumeration before the dynamic provider registers.
  ensureStaticMcpConfig(ws, outputChannel);
}

async function autoBuildMcpServer(ws: vscode.WorkspaceFolder, outputChannel: vscode.OutputChannel) {
  const mcpDir = path.join(ws.uri.fsPath, 'mcp-server');
  const packageJson = path.join(mcpDir, 'package.json');

  if (!fs.existsSync(packageJson)) {
    outputChannel.appendLine('OMG: mcp-server/package.json not found, cannot auto-build');
    return;
  }

  const nodeModules = path.join(mcpDir, 'node_modules');
  const needsInstall = !fs.existsSync(nodeModules);

  outputChannel.appendLine('OMG: Auto-building MCP server...');

  const terminal = vscode.window.createTerminal({
    name: 'OMG: MCP Build',
    cwd: mcpDir,
    hideFromUser: true,
  });

  const cmd = needsInstall ? 'npm install && npm run build' : 'npm run build';
  terminal.sendText(`${cmd} && echo "OMG_BUILD_COMPLETE"`);

  // Watch for the built file to appear
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(ws, 'mcp-server/dist/index.js'),
  );

  watcher.onDidCreate(() => {
    outputChannel.appendLine('OMG: MCP server built successfully');
    vscode.window.showInformationMessage('OMG: MCP server built. Reload to activate MCP tools.', 'Reload Window')
      .then(choice => {
        if (choice === 'Reload Window') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      });
    watcher.dispose();
    terminal.dispose();
  });

  // Clean up after timeout
  setTimeout(() => {
    watcher.dispose();
    terminal.dispose();
  }, 120000);
}

function ensureStaticMcpConfig(ws: vscode.WorkspaceFolder, outputChannel: vscode.OutputChannel) {
  const mcpConfigPath = path.join(ws.uri.fsPath, '.vscode', 'mcp.json');
  if (fs.existsSync(mcpConfigPath)) {
    return; // Don't overwrite existing config
  }

  // Write mcp.json regardless of whether dist/index.js exists yet.
  // VS Code will simply not start the server until the file appears after the build.
  const mcpConfig = {
    servers: {
      'omg-workflow': {
        type: 'stdio',
        command: 'node',
        args: ['${workspaceFolder}/mcp-server/dist/index.js'],
        env: {
          WORKSPACE_ROOT: '${workspaceFolder}',
        },
      },
    },
  };

  fs.mkdirSync(path.dirname(mcpConfigPath), { recursive: true });
  fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
  outputChannel.appendLine('OMG: Generated .vscode/mcp.json (fallback mode)');
}
