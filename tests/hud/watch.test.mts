/**
 * HUD watch daemon tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Module-level mocks — must be hoisted before any imports of the module under test.
// ---------------------------------------------------------------------------

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

vi.mock("../../src/hud/statusline.mts", () => ({
  buildHudState: vi.fn(),
  writeHudArtifacts: vi.fn(),
  getStatuslinePaths: vi.fn(() => ({ hudDir: "/tmp/hud" })),
}));

vi.mock("../../src/hud/renderer.mts", () => ({
  renderAnsi: vi.fn(() => "ANSI_OUTPUT"),
}));

import { readFileSync } from "fs";
import {
  buildHudState,
  writeHudArtifacts,
  getStatuslinePaths,
} from "../../src/hud/statusline.mts";
import { renderAnsi } from "../../src/hud/renderer.mts";
import { runHudWatch } from "../../src/hud/watch.mts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockBuildHudState = buildHudState as ReturnType<typeof vi.fn>;
const mockWriteHudArtifacts = writeHudArtifacts as ReturnType<typeof vi.fn>;
const mockGetStatuslinePaths = getStatuslinePaths as ReturnType<typeof vi.fn>;
const mockRenderAnsi = renderAnsi as ReturnType<typeof vi.fn>;

const MOCK_SNAPSHOT = {
  session_id: "test",
  started_at: Date.now(),
  model: "gpt-4",
  status: "running",
};

const MOCK_STATE = {
  sessionId: "test",
  activeMode: null,
  status: "running",
};

function makeProcessStdoutSpy() {
  return vi.spyOn(process.stdout, "write").mockImplementation(() => true);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runHudWatch", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let sigintListeners: Array<(...args: unknown[]) => void>;
  let sigtermListeners: Array<(...args: unknown[]) => void>;

  beforeEach(() => {
    vi.useFakeTimers();

    stdoutSpy = makeProcessStdoutSpy();
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

    // Capture signal handlers so tests can fire them manually.
    sigintListeners = [];
    sigtermListeners = [];
    const origOn = process.on.bind(process);
    vi.spyOn(process, "on").mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === "SIGINT") sigintListeners.push(handler);
      else if (event === "SIGTERM") sigtermListeners.push(handler);
      else origOn(event as NodeJS.Signals, handler as NodeJS.SignalsListener);
      return process;
    });

    // Default: readFileSync returns a valid snapshot JSON.
    mockReadFileSync.mockReturnValue(JSON.stringify(MOCK_SNAPSHOT));
    mockBuildHudState.mockReturnValue(MOCK_STATE);
    mockWriteHudArtifacts.mockReturnValue({ line: "HUD_LINE", state: MOCK_STATE, paths: {} });
    mockGetStatuslinePaths.mockReturnValue({ hudDir: "/tmp/hud" });
    mockRenderAnsi.mockReturnValue("ANSI_OUTPUT");

    // Reset interval env vars so tests start from a clean env.
    delete process.env["OMP_HUD_INTERVAL"];
    delete process.env["OMP_HUD_POLL_MS"];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts an interval with the default 1000ms", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    runHudWatch();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1_000);
  });

  it("uses OMP_HUD_POLL_MS env var when set", () => {
    process.env["OMP_HUD_POLL_MS"] = "3000";
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    runHudWatch();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 3_000);
  });

  it("OMP_HUD_POLL_MS takes precedence over legacy OMP_HUD_INTERVAL", () => {
    process.env["OMP_HUD_POLL_MS"] = "3000";
    process.env["OMP_HUD_INTERVAL"] = "5000";
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    runHudWatch();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 3_000);
  });

  it("clamps OMP_HUD_POLL_MS to minimum 500ms", () => {
    process.env["OMP_HUD_POLL_MS"] = "100";
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    runHudWatch();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 500);
  });

  it("uses OMP_HUD_INTERVAL env var when set", () => {
    process.env["OMP_HUD_INTERVAL"] = "5000";
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    runHudWatch();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5_000);
  });

  it("clamps OMP_HUD_INTERVAL to minimum 500ms", () => {
    process.env["OMP_HUD_INTERVAL"] = "100";
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    runHudWatch();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 500);
  });

  it("falls back to default when OMP_HUD_INTERVAL is not a number", () => {
    process.env["OMP_HUD_INTERVAL"] = "notanumber";
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    runHudWatch();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1_000);
  });

  it("SIGINT handler calls clearInterval and process.exit(0)", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    runHudWatch();
    expect(sigintListeners).toHaveLength(1);
    sigintListeners[0]!();
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("SIGTERM handler calls clearInterval and process.exit(0)", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    runHudWatch();
    expect(sigtermListeners).toHaveLength(1);
    sigtermListeners[0]!();
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("each tick calls buildHudState, writeHudArtifacts, and renderAnsi", () => {
    runHudWatch();
    // Reset counts after initial tick.
    mockBuildHudState.mockClear();
    mockWriteHudArtifacts.mockClear();
    mockRenderAnsi.mockClear();

    vi.advanceTimersByTime(2_000);

    expect(mockBuildHudState).toHaveBeenCalled();
    expect(mockWriteHudArtifacts).toHaveBeenCalled();
    expect(mockRenderAnsi).toHaveBeenCalled();
  });

  it("writes ANSI output to stdout on each tick", () => {
    runHudWatch();
    stdoutSpy.mockClear();

    vi.advanceTimersByTime(2_000);

    const calls = stdoutSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((s) => s.includes("ANSI_OUTPUT"))).toBe(true);
  });

  it("gracefully continues when readFileSync throws", () => {
    mockReadFileSync.mockImplementationOnce(() => {
      throw new Error("file not found");
    });

    // Initial tick throws but runHudWatch should not throw.
    expect(() => runHudWatch()).not.toThrow();

    // Subsequent tick with valid data works fine.
    mockReadFileSync.mockReturnValue(JSON.stringify(MOCK_SNAPSHOT));
    mockBuildHudState.mockClear();
    vi.advanceTimersByTime(2_000);
    expect(mockBuildHudState).toHaveBeenCalled();
  });

  it("skips pipeline when snapshot is null (invalid JSON)", () => {
    mockReadFileSync.mockReturnValue("not json");
    runHudWatch();
    mockBuildHudState.mockClear();

    vi.advanceTimersByTime(2_000);
    // buildHudState should NOT be called because readSnapshot returns null.
    expect(mockBuildHudState).not.toHaveBeenCalled();
  });
});
