import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface DetectedSession {
  source: 'omc' | 'claude-code';
  mtime: string;
  details: string;
}

/**
 * Lightweight detection of external sessions — runs pure fs checks
 * without depending on the MCP server (which may not be started yet).
 */
function detectExternalSessionsLite(workspaceRoot: string): DetectedSession[] {
  const sessions: DetectedSession[] = [];

  // Check OMC
  const omcStateDir = path.join(workspaceRoot, '.omc', 'state');
  if (fs.existsSync(omcStateDir)) {
    let latestMtime = 0;
    try {
      const files = fs.readdirSync(omcStateDir).filter(f => f.endsWith('.json'));
      for (const f of files) {
        const stat = fs.statSync(path.join(omcStateDir, f));
        latestMtime = Math.max(latestMtime, stat.mtimeMs);
      }
    } catch { /* ignore */ }
    if (latestMtime > 0) {
      sessions.push({
        source: 'omc',
        mtime: new Date(latestMtime).toISOString(),
        details: 'OMC state directory found',
      });
    }
  }

  // Check Claude Code
  const encoded = workspaceRoot.replace(/\//g, '-');
  const claudeDir = path.join(os.homedir(), '.claude', 'projects', encoded);
  if (fs.existsSync(claudeDir)) {
    try {
      const jsonlFiles = fs.readdirSync(claudeDir).filter(f => f.endsWith('.jsonl'));
      let latestMtime = 0;
      let latestFile = '';
      for (const f of jsonlFiles) {
        const stat = fs.statSync(path.join(claudeDir, f));
        if (stat.mtimeMs > latestMtime) {
          latestMtime = stat.mtimeMs;
          latestFile = f;
        }
      }
      if (latestMtime > 0) {
        sessions.push({
          source: 'claude-code',
          mtime: new Date(latestMtime).toISOString(),
          details: `Claude Code session: ${latestFile.replace('.jsonl', '')}`,
        });
      }
    } catch { /* ignore */ }
  }

  return sessions;
}

function formatAge(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

/**
 * Check for external sessions and show a notification if found.
 * Runs once at activation with debounce.
 */
export async function checkExternalSessions(
  context: vscode.ExtensionContext,
  ws: vscode.WorkspaceFolder,
  outputChannel: vscode.OutputChannel,
): Promise<void> {
  // Check "always ignore" workspace state
  const ignoreKey = 'omg.ignoreExternalSessions';
  if (context.workspaceState.get<boolean>(ignoreKey)) {
    outputChannel.appendLine('[Bridge] External session detection disabled by user');
    return;
  }

  // Check if OMG checkpoint already exists and is fresh (< 30 min)
  const checkpointPath = path.join(ws.uri.fsPath, '.omg', 'state', 'session-checkpoint.json');
  if (fs.existsSync(checkpointPath)) {
    try {
      const stat = fs.statSync(checkpointPath);
      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs < 30 * 60 * 1000) {
        outputChannel.appendLine('[Bridge] OMG checkpoint is fresh (< 30 min), skipping external detection');
        return;
      }
    } catch { /* proceed with detection */ }
  }

  const sessions = detectExternalSessionsLite(ws.uri.fsPath);
  if (sessions.length === 0) {
    outputChannel.appendLine('[Bridge] No external sessions detected');
    return;
  }

  // Find the newest external session
  const newest = sessions.reduce((a, b) =>
    new Date(a.mtime).getTime() > new Date(b.mtime).getTime() ? a : b,
  );

  const age = formatAge(newest.mtime);
  const sourceLabel = newest.source === 'omc' ? 'OMC' : 'Claude Code';

  const selection = await vscode.window.showInformationMessage(
    `${sourceLabel} 세션 발견 (${age}). Copilot에서 이어받을까요?`,
    '이어받기',
    '무시',
    '항상 무시',
  );

  if (selection === '이어받기') {
    outputChannel.appendLine(`[Bridge] User chose to resume ${sourceLabel} session`);
    vscode.window.showInformationMessage(
      `Copilot 채팅에서 "resume claude" 또는 "claude 이어받기"를 입력하면 OMG가 세션을 import합니다.`,
    );
  } else if (selection === '항상 무시') {
    await context.workspaceState.update(ignoreKey, true);
    outputChannel.appendLine('[Bridge] User chose to always ignore external sessions');
  } else {
    outputChannel.appendLine('[Bridge] User dismissed external session notification');
  }
}

/**
 * Register the resume-external command.
 */
export function registerResumeExternalCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): void {
  const disposable = vscode.commands.registerCommand('omg.resumeExternal', async () => {
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) {
      vscode.window.showWarningMessage('No workspace folder open');
      return;
    }

    const sessions = detectExternalSessionsLite(ws.uri.fsPath);
    if (sessions.length === 0) {
      vscode.window.showInformationMessage('외부 세션을 찾을 수 없습니다 (OMC / Claude Code)');
      return;
    }

    const items = sessions.map(s => ({
      label: s.source === 'omc' ? 'OMC' : 'Claude Code',
      description: formatAge(s.mtime),
      detail: s.details,
      source: s.source,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: '이어받을 세션을 선택하세요',
    });

    if (!selected) return;

    outputChannel.appendLine(`[Bridge] Manual resume: ${selected.source}`);
    vscode.window.showInformationMessage(
      `Copilot 채팅에서 "resume claude"를 입력하면 ${selected.label} 세션을 import합니다.`,
    );
  });

  context.subscriptions.push(disposable);
}
