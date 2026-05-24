import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface OmgDetected {
  hasState: boolean;
  hasCheckpoint: boolean;
  mtime: string | null;
  details: string;
}

interface OmcDetected {
  exists: boolean;
  mtime: string | null;
  details: string;
}

function detectOmgLite(workspaceRoot: string): OmgDetected {
  const omgDir = path.join(workspaceRoot, '.omg');
  if (!fs.existsSync(omgDir)) {
    return { hasState: false, hasCheckpoint: false, mtime: null, details: '' };
  }

  const items: string[] = [];
  let latestMtime = 0;
  let hasCheckpoint = false;

  for (const candidate of ['prd.json', 'project-memory.json']) {
    const p = path.join(omgDir, candidate);
    if (fs.existsSync(p)) {
      items.push(candidate);
      latestMtime = Math.max(latestMtime, fs.statSync(p).mtimeMs);
    }
  }

  const stateDir = path.join(omgDir, 'state');
  if (fs.existsSync(stateDir)) {
    try {
      const stateFiles = fs.readdirSync(stateDir).filter(f => f.endsWith('.json'));
      for (const f of stateFiles) {
        items.push(`state/${f}`);
        latestMtime = Math.max(latestMtime, fs.statSync(path.join(stateDir, f)).mtimeMs);
        if (f === 'session-checkpoint.json') hasCheckpoint = true;
      }
    } catch { /* ignore */ }
  }

  if (items.length === 0) {
    return { hasState: false, hasCheckpoint: false, mtime: null, details: '' };
  }

  return {
    hasState: true,
    hasCheckpoint,
    mtime: new Date(latestMtime).toISOString(),
    details: `OMG state: ${items.join(', ')}`,
  };
}

function detectOmcLite(workspaceRoot: string): OmcDetected {
  const omcDir = path.join(workspaceRoot, '.omc');
  if (!fs.existsSync(omcDir)) return { exists: false, mtime: null, details: '' };

  let latestMtime = 0;
  const items: string[] = [];
  for (const candidate of ['prd.json', 'project-memory.json']) {
    const p = path.join(omcDir, candidate);
    if (fs.existsSync(p)) {
      items.push(candidate);
      latestMtime = Math.max(latestMtime, fs.statSync(p).mtimeMs);
    }
  }

  const stateDir = path.join(omcDir, 'state');
  if (fs.existsSync(stateDir)) {
    try {
      const stateFiles = fs.readdirSync(stateDir).filter(f => f.endsWith('.json'));
      for (const f of stateFiles) {
        items.push(`state/${f}`);
        latestMtime = Math.max(latestMtime, fs.statSync(path.join(stateDir, f)).mtimeMs);
      }
    } catch { /* ignore */ }
  }

  if (items.length === 0) return { exists: false, mtime: null, details: '' };

  return {
    exists: true,
    mtime: new Date(latestMtime).toISOString(),
    details: `OMC state: ${items.join(', ')}`,
  };
}

function formatAge(isoString: string | null): string {
  if (!isoString) return '없음';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

/**
 * Register the push-external command.
 *
 * No activation-time notification is fired — push is always user-initiated
 * (principle 5). The command checks for an OMG checkpoint, surfaces the OMC
 * destination state, and tells the user how to invoke /push-omc in Copilot
 * chat to perform the actual export.
 */
export function registerPushExternalCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): void {
  const disposable = vscode.commands.registerCommand('omg.pushExternal', async () => {
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) {
      vscode.window.showWarningMessage('No workspace folder open');
      return;
    }

    const omg = detectOmgLite(ws.uri.fsPath);
    if (!omg.hasState) {
      vscode.window.showInformationMessage(
        'OMG state directory가 없습니다. Copilot에서 작업을 진행하면 .omg/ 가 생성됩니다.',
      );
      return;
    }
    if (!omg.hasCheckpoint) {
      const action = await vscode.window.showWarningMessage(
        'OMG 체크포인트가 없습니다. Copilot 채팅에서 `omg_checkpoint`를 먼저 호출해 현재 상태를 저장해주세요.',
        'OK',
      );
      outputChannel.appendLine(`[Push] No checkpoint; user dismissed: ${action ?? 'Esc'}`);
      return;
    }

    const omc = detectOmcLite(ws.uri.fsPath);
    const omgAge = formatAge(omg.mtime);
    const omcAge = formatAge(omc.mtime);

    const items = [
      {
        label: 'OMC로 표준 푸시',
        description: 'conflicts[] 보고 (덮어쓰기 없음)',
        detail: `OMG: ${omgAge} · OMC: ${omcAge}`,
        action: 'standard',
      },
      {
        label: 'OMC로 강제 푸시 (force)',
        description: '덮어쓰기 + .previous.{ISO}.json 백업 회전 (N=3)',
        detail: omc.exists ? `OMC 존재: ${omc.details}` : 'OMC 디렉토리 없음 (생성됨)',
        action: 'force',
      },
      {
        label: '취소',
        description: '',
        detail: '',
        action: 'cancel',
      },
    ];

    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: 'OMG → OMC 푸시 모드를 선택하세요',
    });

    if (!picked || picked.action === 'cancel') return;

    outputChannel.appendLine(`[Push] User selected: ${picked.action}`);

    const followUp = picked.action === 'force'
      ? 'Copilot 채팅에서 `/push-omc force` 또는 "omc로 강제 푸시"를 입력하면 OMG가 export를 수행합니다.'
      : 'Copilot 채팅에서 `/push-omc` 또는 "omc 푸시"를 입력하면 OMG가 export를 수행합니다.';

    vscode.window.showInformationMessage(followUp);
  });

  context.subscriptions.push(disposable);
}
