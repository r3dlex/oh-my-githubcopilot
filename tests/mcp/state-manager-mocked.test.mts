/**
 * MCP State Manager — mocked tests for JSON fallback path coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/mcp/db-loader.mts", () => ({
  SqliteConstructor: null,
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("os", () => ({
  homedir: () => "/home/testuser",
}));

import { existsSync, readFileSync, writeFileSync } from "fs";

describe("MCP state-manager (JSON fallback)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function loadManager() {
    return import("../../src/mcp/state-manager.mts");
  }

  describe("getLatestSession", () => {
    it("returns null when json file does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const mgr = await loadManager();
      const result = mgr.getLatestSession();
      expect(result).toBeNull();
    });

    it("returns null when no sessions in json", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("[]");
      const mgr = await loadManager();
      const result = mgr.getLatestSession();
      expect(result).toBeNull();
    });

    it("returns latest session sorted by updated_at desc", async () => {
      const sessions = [
        { id: "s1", worktree_id: null, state_json: "{}", created_at: 1, updated_at: 10 },
        { id: "s2", worktree_id: null, state_json: "{}", created_at: 2, updated_at: 20 },
      ];
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(sessions));
      const mgr = await loadManager();
      const result = mgr.getLatestSession();
      expect(result?.id).toBe("s2");
    });

    it("returns null when json is corrupt", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("{{{not-json");
      const mgr = await loadManager();
      const result = mgr.getLatestSession();
      expect(result).toBeNull();
    });
  });

  describe("saveSession", () => {
    it("creates new session when it does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("[]");
      vi.mocked(writeFileSync).mockImplementation(() => {});
      const mgr = await loadManager();
      mgr.saveSession("new-id", null, { status: "active" });
      expect(writeFileSync).toHaveBeenCalled();
      const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
      expect(written).toHaveLength(1);
      expect(written[0].id).toBe("new-id");
      expect(written[0].worktree_id).toBeNull();
    });

    it("updates existing session state_json and updated_at", async () => {
      const existing = [
        { id: "existing-id", worktree_id: "wt1", state_json: '{"old":true}', created_at: 100, updated_at: 100 },
      ];
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existing));
      vi.mocked(writeFileSync).mockImplementation(() => {});
      const mgr = await loadManager();
      mgr.saveSession("existing-id", "wt1", { new: true });
      const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
      expect(written[0].state_json).toBe('{"new":true}');
      expect(written[0].updated_at).toBeGreaterThanOrEqual(100);
    });

    it("accepts worktreeId parameter", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error("no file"); });
      vi.mocked(writeFileSync).mockImplementation(() => {});
      const mgr = await loadManager();
      mgr.saveSession("sid", "wt-123", { status: "running" });
      const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
      expect(written[0].worktree_id).toBe("wt-123");
    });
  });

  describe("listSessions", () => {
    it("returns empty array when no file", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const mgr = await loadManager();
      const result = mgr.listSessions();
      expect(result).toEqual([]);
    });

    it("returns sessions sorted by updated_at desc", async () => {
      const sessions = [
        { id: "s1", worktree_id: null, state_json: "{}", created_at: 1, updated_at: 5 },
        { id: "s2", worktree_id: null, state_json: "{}", created_at: 2, updated_at: 10 },
        { id: "s3", worktree_id: null, state_json: "{}", created_at: 3, updated_at: 3 },
      ];
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(sessions));
      const mgr = await loadManager();
      const result = mgr.listSessions();
      expect(result[0].id).toBe("s2");
      expect(result[2].id).toBe("s3");
    });
  });

  describe("getSession", () => {
    it("returns null for nonexistent session", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("[]");
      const mgr = await loadManager();
      const result = mgr.getSession("nonexistent");
      expect(result).toBeNull();
    });

    it("returns matching session by id", async () => {
      const sessions = [
        { id: "find-me", worktree_id: null, state_json: '{"found":true}', created_at: 1, updated_at: 1 },
      ];
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(sessions));
      const mgr = await loadManager();
      const result = mgr.getSession("find-me");
      expect(result?.id).toBe("find-me");
    });
  });

  describe("deleteSession", () => {
    it("removes session from json by id", async () => {
      const sessions = [
        { id: "del-me", worktree_id: null, state_json: "{}", created_at: 1, updated_at: 1 },
        { id: "keep-me", worktree_id: null, state_json: "{}", created_at: 2, updated_at: 2 },
      ];
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(sessions));
      vi.mocked(writeFileSync).mockImplementation(() => {});
      const mgr = await loadManager();
      mgr.deleteSession("del-me");
      const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
      expect(written).toHaveLength(1);
      expect(written[0].id).toBe("keep-me");
    });

    it("does not throw when deleting nonexistent session", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("[]");
      vi.mocked(writeFileSync).mockImplementation(() => {});
      const mgr = await loadManager();
      expect(() => mgr.deleteSession("nonexistent")).not.toThrow();
    });
  });

  describe("closeDb", () => {
    it("does nothing when no db is open (sqlite=null)", async () => {
      const mgr = await loadManager();
      expect(() => mgr.closeDb()).not.toThrow();
    });
  });
});
