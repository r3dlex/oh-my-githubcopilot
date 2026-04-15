/**
 * PSM Session — mocked tests for full branch coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  rmSync: vi.fn(),
}));

vi.mock("os", () => ({
  homedir: () => "/home/testuser",
}));

vi.mock("path", async () => {
  const actual = await vi.importActual<typeof import("path")>("path");
  return { ...actual };
});

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";

describe("PSM session (mocked fs)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function loadSession() {
    return import("../../src/psm/session.mts");
  }

  describe("createSession", () => {
    it("creates session record with expected shape", async () => {
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error("no file"); });
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(mkdirSync).mockImplementation(() => undefined);
      const mod = await loadSession();
      const result = mod.createSession("my-session");
      expect(result.name).toBe("my-session");
      expect(result.status).toBe("active");
      expect(result.id).toMatch(/^psm-/);
      expect(result.branch).toBe("omp/my-session");
      expect(result.worktreePath).toContain("my-session");
    });

    it("appends to existing sessions index", async () => {
      const existing = [
        { id: "existing-1", name: "old-session", worktreePath: "/p", branch: "b", createdAt: 1, lastActivityAt: 1, status: "active" },
      ];
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existing));
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(mkdirSync).mockImplementation(() => undefined);
      const mod = await loadSession();
      mod.createSession("new-session");
      const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
      expect(written).toHaveLength(2);
    });

    it("writes session.json to session state directory", async () => {
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error("no file"); });
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(mkdirSync).mockImplementation(() => undefined);
      const mod = await loadSession();
      mod.createSession("session-dir-test");
      // Second writeFileSync call is the session.json
      expect(writeFileSync).toHaveBeenCalledTimes(2);
    });
  });

  describe("listSessions", () => {
    it("returns empty array when index file does not exist", async () => {
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error("ENOENT"); });
      const mod = await loadSession();
      const result = mod.listSessions();
      expect(result).toEqual([]);
    });

    it("returns sessions from index", async () => {
      const sessions = [
        { id: "s1", name: "sess1", worktreePath: "/p", branch: "b", createdAt: 1, lastActivityAt: 1, status: "active" },
      ];
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(sessions));
      const mod = await loadSession();
      const result = mod.listSessions();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("sess1");
    });
  });

  describe("switchSession", () => {
    it("returns null when session not found", async () => {
      vi.mocked(readFileSync).mockReturnValue("[]");
      const mod = await loadSession();
      const result = mod.switchSession("nonexistent");
      expect(result).toBeNull();
    });

    it("returns null when session is not active", async () => {
      const sessions = [
        { id: "s1", name: "archived-sess", worktreePath: "/p", branch: "b", createdAt: 1, lastActivityAt: 1, status: "archived" },
      ];
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(sessions));
      const mod = await loadSession();
      const result = mod.switchSession("archived-sess");
      expect(result).toBeNull();
    });

    it("returns session and updates lastActivityAt when found", async () => {
      const sessions = [
        { id: "s1", name: "active-sess", worktreePath: "/p", branch: "b", createdAt: 1, lastActivityAt: 1, status: "active" },
      ];
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(sessions));
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(mkdirSync).mockImplementation(() => undefined);
      const mod = await loadSession();
      const result = mod.switchSession("active-sess");
      expect(result).not.toBeNull();
      expect(result?.name).toBe("active-sess");
      expect(writeFileSync).toHaveBeenCalled();
    });
  });

  describe("destroySession", () => {
    it("returns false when session not found", async () => {
      vi.mocked(readFileSync).mockReturnValue("[]");
      const mod = await loadSession();
      const result = mod.destroySession("nonexistent");
      expect(result).toBe(false);
    });

    it("removes session from index and cleans up state dir", async () => {
      const sessions = [
        { id: "del-id", name: "del-sess", worktreePath: "/p/del-sess", branch: "b", createdAt: 1, lastActivityAt: 1, status: "active" },
      ];
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(sessions));
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(mkdirSync).mockImplementation(() => undefined);
      vi.mocked(rmSync).mockImplementation(() => {});
      const mod = await loadSession();
      const result = mod.destroySession("del-sess");
      expect(result).toBe(true);
      const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
      expect(written).toHaveLength(0);
      expect(rmSync).toHaveBeenCalled();
    });

    it("removes worktree path when removeWorktree=true", async () => {
      const sessions = [
        { id: "rw-id", name: "rw-sess", worktreePath: "/home/testuser/.omp-sessions/rw-sess", branch: "b", createdAt: 1, lastActivityAt: 1, status: "active" },
      ];
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(sessions));
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(mkdirSync).mockImplementation(() => undefined);
      vi.mocked(rmSync).mockImplementation(() => {});
      const mod = await loadSession();
      const result = mod.destroySession("rw-sess", true);
      expect(result).toBe(true);
      // rmSync should be called twice: once for session dir, once for worktree path
      expect(rmSync).toHaveBeenCalledTimes(2);
    });

    it("handles rmSync error gracefully (cleanup error ignored)", async () => {
      const sessions = [
        { id: "err-id", name: "err-sess", worktreePath: "/p/err-sess", branch: "b", createdAt: 1, lastActivityAt: 1, status: "active" },
      ];
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(sessions));
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(mkdirSync).mockImplementation(() => undefined);
      vi.mocked(rmSync).mockImplementation(() => { throw new Error("rm failed"); });
      const mod = await loadSession();
      expect(() => mod.destroySession("err-sess")).not.toThrow();
    });
  });
});
