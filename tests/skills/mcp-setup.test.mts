/**
 * MCP Setup Skill Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

import { spawn } from "child_process";
import { activateMcpSetupSkill } from "../../src/skills/mcp-setup.mts";

const mockSpawn = vi.mocked(spawn);

function makeChild(closeCode: number | null, errorMsg?: string) {
  const listeners: Record<string, Function> = {};
  const child = {
    on: vi.fn((event: string, cb: Function) => {
      listeners[event] = cb;
      return child;
    }),
    // helper to trigger events in tests
    _emit: (event: string, ...args: unknown[]) => listeners[event]?.(...args),
  };
  // Simulate async event
  setTimeout(() => {
    if (errorMsg) {
      child._emit("error", new Error(errorMsg));
    } else {
      child._emit("close", closeCode);
    }
  }, 0);
  return child;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("activateMcpSetupSkill", () => {
  it("should resolve ok when omp exits with code 0 (interactive mode)", async () => {
    mockSpawn.mockReturnValue(makeChild(0) as any);
    const result = await activateMcpSetupSkill();
    expect(result.status).toBe("ok");
    expect(result.message).toContain("complete");
    expect(result.hud).toBeTruthy();
  });

  it("should resolve ok with no args (interactive mode)", async () => {
    mockSpawn.mockReturnValue(makeChild(0) as any);
    const result = await activateMcpSetupSkill({ args: [] });
    expect(result.status).toBe("ok");
  });

  it("should resolve error when omp exits with non-zero code", async () => {
    mockSpawn.mockReturnValue(makeChild(1) as any);
    const result = await activateMcpSetupSkill({ args: ["--non-interactive"] });
    expect(result.status).toBe("error");
    expect(result.message).toContain("code 1");
  });

  it("should resolve error when spawn emits error event", async () => {
    mockSpawn.mockReturnValue(makeChild(null, "omp not found") as any);
    const result = await activateMcpSetupSkill();
    expect(result.status).toBe("error");
    expect(result.message).toContain("omp not found");
  });

  it("should pass --non-interactive when args contain a non-interactive flag", async () => {
    mockSpawn.mockReturnValue(makeChild(0) as any);
    await activateMcpSetupSkill({ args: ["--non-interactive"] });
    expect(mockSpawn).toHaveBeenCalledWith(
      "omp",
      expect.arrayContaining(["--non-interactive"]),
      expect.any(Object)
    );
  });

  it("should pass through extra args", async () => {
    mockSpawn.mockReturnValue(makeChild(0) as any);
    await activateMcpSetupSkill({ args: ["--non-interactive", "--verbose"] });
    expect(mockSpawn).toHaveBeenCalledWith(
      "omp",
      expect.arrayContaining(["--verbose"]),
      expect.any(Object)
    );
  });

  it("should not duplicate spawnArgs entries", async () => {
    mockSpawn.mockReturnValue(makeChild(0) as any);
    await activateMcpSetupSkill({ args: ["--mcp-only"] });
    const spawnArgs: string[] = mockSpawn.mock.calls[0][1] as string[];
    const mcpOnlyCount = spawnArgs.filter((a) => a === "--mcp-only").length;
    expect(mcpOnlyCount).toBe(1);
  });
});
