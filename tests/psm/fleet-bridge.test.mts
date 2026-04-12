/**
 * PSM Fleet Bridge Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs and path so no actual files are touched
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("os", () => ({
  homedir: () => "/mock-home",
}));

import { existsSync, readFileSync, writeFileSync } from "fs";
import {
  registerFleetMember,
  unregisterFleetMember,
  updateFleetMemberStatus,
  listFleetMembers,
  getFleetStats,
} from "../../src/psm/fleet-bridge.mts";

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no fleet file exists
  mockExistsSync.mockReturnValue(false);
});

describe("listFleetMembers", () => {
  it("should return empty array when fleet file does not exist", () => {
    mockExistsSync.mockReturnValue(false);
    const result = listFleetMembers();
    expect(result).toEqual([]);
  });

  it("should return members when fleet file exists", () => {
    const members = [{ sessionId: "s1", worktreePath: "/path", status: "idle" }];
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(members) as any);
    const result = listFleetMembers();
    expect(result).toEqual(members);
  });

  it("should return empty array when fleet file is malformed JSON", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("not-json" as any);
    const result = listFleetMembers();
    expect(result).toEqual([]);
  });
});

describe("registerFleetMember", () => {
  it("should add a new member and write fleet", () => {
    mockExistsSync.mockReturnValue(false);
    const member = registerFleetMember("session-1", "/workspace/1");
    expect(member.sessionId).toBe("session-1");
    expect(member.worktreePath).toBe("/workspace/1");
    expect(member.status).toBe("idle");
    expect(mockWriteFileSync).toHaveBeenCalled();
  });

  it("should return existing member without duplicating", () => {
    const existing = [{ sessionId: "s1", worktreePath: "/path", status: "idle" as const }];
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(existing) as any);

    const result = registerFleetMember("s1", "/path");
    expect(result.sessionId).toBe("s1");
    // writeFileSync should NOT be called since member already exists
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });
});

describe("unregisterFleetMember", () => {
  it("should remove the member and write fleet", () => {
    const members = [
      { sessionId: "s1", worktreePath: "/path1", status: "idle" as const },
      { sessionId: "s2", worktreePath: "/path2", status: "busy" as const },
    ];
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(members) as any);

    unregisterFleetMember("s1");

    expect(mockWriteFileSync).toHaveBeenCalled();
    const written = JSON.parse((mockWriteFileSync as any).mock.calls[0][1]);
    expect(written).toHaveLength(1);
    expect(written[0].sessionId).toBe("s2");
  });

  it("should not throw when member does not exist", () => {
    mockExistsSync.mockReturnValue(false);
    expect(() => unregisterFleetMember("nonexistent")).not.toThrow();
  });
});

describe("updateFleetMemberStatus", () => {
  it("should update status for existing member", () => {
    const members = [{ sessionId: "s1", worktreePath: "/path", status: "idle" as const }];
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(members) as any);

    updateFleetMemberStatus("s1", "busy");

    expect(mockWriteFileSync).toHaveBeenCalled();
    const written = JSON.parse((mockWriteFileSync as any).mock.calls[0][1]);
    expect(written[0].status).toBe("busy");
  });

  it("should not write when member does not exist", () => {
    mockExistsSync.mockReturnValue(false);
    updateFleetMemberStatus("nonexistent", "error");
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });
});

describe("getFleetStats", () => {
  it("should return zeroed stats when fleet is empty", () => {
    mockExistsSync.mockReturnValue(false);
    const stats = getFleetStats();
    expect(stats).toEqual({ total: 0, idle: 0, busy: 0, error: 0 });
  });

  it("should count members by status", () => {
    const members = [
      { sessionId: "s1", worktreePath: "/p1", status: "idle" as const },
      { sessionId: "s2", worktreePath: "/p2", status: "busy" as const },
      { sessionId: "s3", worktreePath: "/p3", status: "busy" as const },
      { sessionId: "s4", worktreePath: "/p4", status: "error" as const },
    ];
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(members) as any);

    const stats = getFleetStats();
    expect(stats.total).toBe(4);
    expect(stats.idle).toBe(1);
    expect(stats.busy).toBe(2);
    expect(stats.error).toBe(1);
  });
});
