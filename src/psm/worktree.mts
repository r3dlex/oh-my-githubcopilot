/**
 * PSM — Worktree Management
 * Git worktree operations via simple-git.
 */

import gitP, { type SimpleGit } from "simple-git";
import { mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const WORKTREE_BASE = () => join(homedir(), ".omp-sessions");

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

/**
 * Create a git worktree for a PSM session.
 */
export async function createWorktree(sessionName: string, baseBranch = "HEAD"): Promise<{ path: string; branch: string }> {
  const git: SimpleGit = gitP as unknown as SimpleGit;
  const worktreePath = join(WORKTREE_BASE(), sessionName);
  const branch = `omp/${sessionName}`;

  ensureDir(WORKTREE_BASE());
  ensureDir(join(WORKTREE_BASE(), sessionName));

  await git.fetch();
  await git.raw(["worktree", "add", worktreePath, baseBranch, "-b", branch]);

  return { path: worktreePath, branch };
}

/**
 * Remove a git worktree.
 */
export async function removeWorktree(sessionName: string): Promise<void> {
  const git: SimpleGit = gitP as unknown as SimpleGit;
  const worktreePath = join(WORKTREE_BASE(), sessionName);

  try {
    await git.raw(["worktree", "remove", worktreePath, "--force"]);
  } catch {
    // Ignore if already removed
  }
}

/**
 * List all worktrees.
 */
export async function listWorktrees(): Promise<Array<{ path: string; branch: string; HEAD: string }>> {
  const git: SimpleGit = gitP as unknown as SimpleGit;
  try {
    const output = await git.raw(["worktree", "list", "--porcelain"]);
    const worktrees: Array<{ path: string; branch: string; HEAD: string }> = [];
    const entries = output.split("\n\n");

    for (const entry of entries) {
      const lines = entry.split("\n");
      const pathLine = lines.find((l) => l.startsWith("worktree "));
      const branchLine = lines.find((l) => l.startsWith("branch "));
      const headLine = lines.find((l) => l.startsWith("HEAD "));
      if (pathLine) {
        worktrees.push({
          path: pathLine.replace("worktree ", ""),
          branch: branchLine?.replace("branch ", "") || "(detached)",
          HEAD: headLine?.replace("HEAD ", "") || "",
        });
      }
    }
    return worktrees;
  } catch {
    return [];
  }
}
