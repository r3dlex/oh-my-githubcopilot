/**
 * MCP Memory Store — mocked tests for JSON fallback path coverage
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

vi.mock("path", async () => {
  const actual = await vi.importActual<typeof import("path")>("path");
  return { ...actual };
});

import { existsSync, readFileSync, writeFileSync } from "fs";

describe("MCP memory-store (JSON fallback)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function loadStore() {
    const mod = await import("../../src/mcp/memory-store.mts");
    return mod;
  }

  describe("get", () => {
    it("returns null when json file does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const store = await loadStore();
      const result = store.get("missing-key");
      expect(result).toBeNull();
    });

    it("returns null when key not in json memory", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ other: { key: "other", value: "v", category: null, session_id: null, created_at: 1, updated_at: 1 } }));
      const store = await loadStore();
      const result = store.get("missing-key");
      expect(result).toBeNull();
    });

    it("returns value when key exists in json memory", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        "my-key": { key: "my-key", value: "my-value", category: null, session_id: null, created_at: 1, updated_at: 1 },
      }));
      const store = await loadStore();
      const result = store.get("my-key");
      expect(result).toBe("my-value");
    });

    it("returns null when json file is corrupt", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("not-json{{{");
      const store = await loadStore();
      const result = store.get("any-key");
      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("creates new entry in json when key does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error("no file"); });
      vi.mocked(writeFileSync).mockImplementation(() => {});
      const store = await loadStore();
      store.set("new-key", "new-value");
      expect(writeFileSync).toHaveBeenCalled();
      const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
      expect(written["new-key"].value).toBe("new-value");
    });

    it("updates existing entry preserving created_at", async () => {
      const existing = {
        "existing-key": { key: "existing-key", value: "old-value", category: "cat", session_id: "sid", created_at: 100, updated_at: 100 },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existing));
      vi.mocked(writeFileSync).mockImplementation(() => {});
      const store = await loadStore();
      store.set("existing-key", "new-value");
      const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
      expect(written["existing-key"].value).toBe("new-value");
      expect(written["existing-key"].created_at).toBe(100);
      expect(written["existing-key"].category).toBe("cat");
    });

    it("sets category and sessionId on new entry", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error("no file"); });
      vi.mocked(writeFileSync).mockImplementation(() => {});
      const store = await loadStore();
      store.set("key", "val", "my-cat", "my-session");
      const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
      expect(written["key"].category).toBe("my-cat");
      expect(written["key"].session_id).toBe("my-session");
    });
  });

  describe("del", () => {
    it("deletes existing key from json", async () => {
      const existing = {
        "del-key": { key: "del-key", value: "v", category: null, session_id: null, created_at: 1, updated_at: 1 },
        "keep-key": { key: "keep-key", value: "v2", category: null, session_id: null, created_at: 1, updated_at: 1 },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existing));
      vi.mocked(writeFileSync).mockImplementation(() => {});
      const store = await loadStore();
      store.del("del-key");
      const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
      expect(written["del-key"]).toBeUndefined();
      expect(written["keep-key"]).toBeDefined();
    });

    it("does not throw when deleting nonexistent key", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}));
      vi.mocked(writeFileSync).mockImplementation(() => {});
      const store = await loadStore();
      expect(() => store.del("nonexistent")).not.toThrow();
    });
  });

  describe("listByCategory", () => {
    it("returns entries matching category sorted by updated_at desc", async () => {
      const mem = {
        a: { key: "a", value: "v1", category: "cat1", session_id: null, created_at: 1, updated_at: 1 },
        b: { key: "b", value: "v2", category: "cat1", session_id: null, created_at: 2, updated_at: 3 },
        c: { key: "c", value: "v3", category: "cat2", session_id: null, created_at: 3, updated_at: 2 },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mem));
      const store = await loadStore();
      const result = store.listByCategory("cat1");
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe("b");
      expect(result[1].key).toBe("a");
    });

    it("returns empty array when no entries match category", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const store = await loadStore();
      const result = store.listByCategory("nonexistent");
      expect(result).toEqual([]);
    });
  });

  describe("listBySession", () => {
    it("returns entries matching session_id sorted by updated_at desc", async () => {
      const mem = {
        a: { key: "a", value: "v1", category: null, session_id: "sess1", created_at: 1, updated_at: 1 },
        b: { key: "b", value: "v2", category: null, session_id: "sess1", created_at: 2, updated_at: 5 },
        c: { key: "c", value: "v3", category: null, session_id: "sess2", created_at: 3, updated_at: 2 },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mem));
      const store = await loadStore();
      const result = store.listBySession("sess1");
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe("b");
    });

    it("returns empty array when no entries match session", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const store = await loadStore();
      const result = store.listBySession("nonexistent");
      expect(result).toEqual([]);
    });
  });

  describe("listAll", () => {
    it("returns all entries sorted by updated_at desc", async () => {
      const mem = {
        a: { key: "a", value: "v1", category: null, session_id: null, created_at: 1, updated_at: 2 },
        b: { key: "b", value: "v2", category: null, session_id: null, created_at: 2, updated_at: 5 },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mem));
      const store = await loadStore();
      const result = store.listAll();
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe("b");
    });

    it("returns empty array when no file", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const store = await loadStore();
      const result = store.listAll();
      expect(result).toEqual([]);
    });
  });

  describe("clearAll", () => {
    it("writes empty object to json file", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(writeFileSync).mockImplementation(() => {});
      const store = await loadStore();
      store.clearAll();
      expect(writeFileSync).toHaveBeenCalled();
      const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
      expect(written).toEqual({});
    });
  });

  describe("closeDb", () => {
    it("does nothing when no db is open (sqlite=null)", async () => {
      const store = await loadStore();
      expect(() => store.closeDb()).not.toThrow();
    });
  });
});
