import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
const processExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

async function runIndex(argv: string[]) {
  const originalArgv = process.argv;
  try {
    process.argv = ["node", "omp", ...argv];
    await vi.resetModules();
    await import("../../src/index.mts");
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    process.argv = originalArgv;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unmock("fs");
  vi.unmock("os");
  vi.unmock("path");
  vi.unmock("../../src/hud/watch.mts");
});

afterEach(() => {
  vi.resetModules();
});

describe("src/index.mts CLI", () => {
  it("prints the HUD line by default", async () => {
    vi.doMock("fs", () => ({
      readFileSync: vi.fn(() => "HUD LINE\n"),
    }));
    vi.doMock("os", () => ({ homedir: vi.fn(() => "/tmp/home") }));
    vi.doMock("path", () => ({ join: vi.fn((...parts: string[]) => parts.join("/")) }));

    await runIndex([]);

    expect(consoleLog).toHaveBeenCalledWith("HUD LINE");
  });

  it("prints the fallback HUD message when the HUD file is missing", async () => {
    vi.doMock("fs", () => ({
      readFileSync: vi.fn(() => {
        throw new Error("ENOENT");
      }),
    }));

    await runIndex(["hud"]);

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining("hud: no active session"));
  });

  it("runs HUD watch mode when --watch is passed", async () => {
    const runHudWatch = vi.fn();
    vi.doMock("../../src/hud/watch.mts", () => ({ runHudWatch }));

    await runIndex(["hud", "--watch"]);

    expect(runHudWatch).toHaveBeenCalledTimes(1);
  });

  it("prints the package version", async () => {
    await runIndex(["version"]);

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining("oh-my-githubcopilot v"));
  });

  it("prints PSM guidance", async () => {
    await runIndex(["psm"]);

    expect(consoleLog).toHaveBeenCalledWith("PSM commands:");
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining("create <name>"));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining("Destroy session"));
  });

  it("prints SWE-bench guidance", async () => {
    await runIndex(["bench"]);

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining("SWE-bench requires Node.js subprocess"));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining("/omp:swe-bench"));
  });

  it("exits with usage output for an unknown subcommand", async () => {
    await runIndex(["unknown"]);

    expect(consoleError).toHaveBeenCalledWith("Unknown subcommand: unknown");
    expect(consoleError).toHaveBeenCalledWith("Usage: omp [hud|version|psm|bench]");
    expect(processExit).toHaveBeenCalledWith(1);
  });
});
