/**
 * PSM Worktree — mocked tests for full branch coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGit = {
  fetch: vi.fn(),
  raw: vi.fn(),
};

vi.mock("simple-git", () => ({
  default: mockGit,
}));

vi.mock("fs", () => ({
  mkdirSync: vi.fn(),
}));

vi.mock("os", () => ({
  homedir: () => "/home/testuser",
}));

import { mkdirSync } from "fs";

describe("PSM worktree (mocked git)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function loadWorktree() {
    return import("../../src/psm/worktree.mts");
  }

  describe("createWorktree", () => {
    it("returns path and branch on success", async () => {
      mockGit.fetch.mockResolvedValue(undefined);
      mockGit.raw.mockResolvedValue("");
      const mod = await loadWorktree();
      const result = await mod.createWorktree("my-session");
      expect(result.path).toContain("my-session");
      expect(result.branch).toBe("omp/my-session");
    });

    it("uses provided baseBranch", async () => {
      mockGit.fetch.mockResolvedValue(undefined);
      mockGit.raw.mockResolvedValue("");
      const mod = await loadWorktree();
      const result = await mod.createWorktree("test-sess", "main");
      expect(result.branch).toBe("omp/test-sess");
      expect(mockGit.raw).toHaveBeenCalledWith(
        expect.arrayContaining(["main"])
      );
    });

    it("creates required directories", async () => {
      mockGit.fetch.mockResolvedValue(undefined);
      mockGit.raw.mockResolvedValue("");
      vi.mocked(mkdirSync).mockImplementation(() => undefined);
      const mod = await loadWorktree();
      await mod.createWorktree("dir-test");
      expect(mkdirSync).toHaveBeenCalled();
    });

    it("propagates git errors", async () => {
      mockGit.fetch.mockRejectedValue(new Error("git fetch failed"));
      const mod = await loadWorktree();
      await expect(mod.createWorktree("fail-session")).rejects.toThrow("git fetch failed");
    });
  });

  describe("removeWorktree", () => {
    it("calls git worktree remove with force", async () => {
      mockGit.raw.mockResolvedValue("");
      const mod = await loadWorktree();
      await mod.removeWorktree("my-session");
      expect(mockGit.raw).toHaveBeenCalledWith(
        expect.arrayContaining(["worktree", "remove", "--force"])
      );
    });

    it("does not throw when git worktree remove fails", async () => {
      mockGit.raw.mockRejectedValue(new Error("not a worktree"));
      const mod = await loadWorktree();
      await expect(mod.removeWorktree("nonexistent")).resolves.not.toThrow();
    });
  });

  describe("listWorktrees", () => {
    it("parses porcelain output into worktree array", async () => {
      const porcelain = [
        "worktree /home/user/project",
        "HEAD abc123",
        "branch refs/heads/main",
        "",
        "worktree /home/testuser/.omp-sessions/feat",
        "HEAD def456",
        "branch refs/heads/omp/feat",
      ].join("\n");
      mockGit.raw.mockResolvedValue(porcelain);
      const mod = await loadWorktree();
      const result = await mod.listWorktrees();
      expect(result).toHaveLength(2);
      expect(result[0].path).toBe("/home/user/project");
      expect(result[0].branch).toBe("refs/heads/main");
      expect(result[0].HEAD).toBe("abc123");
    });

    it("uses (detached) when no branch line present", async () => {
      const porcelain = [
        "worktree /home/user/project",
        "HEAD abc123",
      ].join("\n");
      mockGit.raw.mockResolvedValue(porcelain);
      const mod = await loadWorktree();
      const result = await mod.listWorktrees();
      expect(result[0].branch).toBe("(detached)");
    });

    it("returns empty array when git command fails", async () => {
      mockGit.raw.mockRejectedValue(new Error("not a git repo"));
      const mod = await loadWorktree();
      const result = await mod.listWorktrees();
      expect(result).toEqual([]);
    });

    it("returns empty string for HEAD when no HEAD line", async () => {
      const porcelain = "worktree /home/user/project\nbranch refs/heads/main";
      mockGit.raw.mockResolvedValue(porcelain);
      const mod = await loadWorktree();
      const result = await mod.listWorktrees();
      expect(result[0].HEAD).toBe("");
    });
  });
});
