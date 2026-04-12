/**
 * Config Utility Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, mkdtempSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

vi.mock("os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("os")>();
  return {
    ...actual,
    homedir: vi.fn(() => actual.homedir()),
  };
});

import * as osMod from "os";

describe("config", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "omp-config-test-"));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    vi.mocked(osMod.homedir).mockReturnValue(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // Dynamic import is needed because config.mts calls process.cwd() and homedir() at call time (not import time)
  async function getConfig() {
    const { loadConfig, writeConfig } = await import("../../src/utils/config.mts");
    return { loadConfig, writeConfig };
  }

  it("returns empty object when local config file is missing", async () => {
    const { loadConfig } = await getConfig();
    expect(loadConfig("test", "local")).toEqual({});
  });

  it("returns empty object when global config file is missing", async () => {
    const { loadConfig } = await getConfig();
    expect(loadConfig("test", "global")).toEqual({});
  });

  it("reads local config correctly", async () => {
    mkdirSync(join(tmpDir, ".omp"), { recursive: true });
    writeFileSync(join(tmpDir, ".omp", "config.json"), JSON.stringify({ key: "value", num: 42 }));
    const { loadConfig } = await getConfig();
    const result = loadConfig<{ key: string; num: number }>("test", "local");
    expect(result).toEqual({ key: "value", num: 42 });
  });

  it("reads global config correctly", async () => {
    const globalDir = mkdtempSync(join(tmpdir(), "omp-global-"));
    vi.mocked(osMod.homedir).mockReturnValue(globalDir);
    mkdirSync(join(globalDir, ".omp"), { recursive: true });
    writeFileSync(join(globalDir, ".omp", "config.json"), JSON.stringify({ globalKey: "gval" }));
    const { loadConfig } = await getConfig();
    const result = loadConfig<{ globalKey: string }>("test", "global");
    expect(result).toEqual({ globalKey: "gval" });
    rmSync(globalDir, { recursive: true, force: true });
  });

  it("returns empty object for malformed local JSON without throwing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mkdirSync(join(tmpDir, ".omp"), { recursive: true });
    writeFileSync(join(tmpDir, ".omp", "config.json"), "{ this is not valid json");
    const { loadConfig } = await getConfig();
    const result = loadConfig("test", "local");
    expect(result).toEqual({});
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain("[OMP] config: malformed JSON");
  });

  it("returns empty object for malformed global JSON without throwing", async () => {
    const globalDir = mkdtempSync(join(tmpdir(), "omp-global-mal-"));
    vi.mocked(osMod.homedir).mockReturnValue(globalDir);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mkdirSync(join(globalDir, ".omp"), { recursive: true });
    writeFileSync(join(globalDir, ".omp", "config.json"), "not-json");
    const { loadConfig } = await getConfig();
    const result = loadConfig("test", "global");
    expect(result).toEqual({});
    expect(warnSpy).toHaveBeenCalledOnce();
    rmSync(globalDir, { recursive: true, force: true });
  });

  it("merges global and local with local winning on shared keys", async () => {
    const globalDir = mkdtempSync(join(tmpdir(), "omp-global-merge-"));
    vi.mocked(osMod.homedir).mockReturnValue(globalDir);

    mkdirSync(join(globalDir, ".omp"), { recursive: true });
    writeFileSync(
      join(globalDir, ".omp", "config.json"),
      JSON.stringify({ shared: "global", globalOnly: "g" })
    );

    mkdirSync(join(tmpDir, ".omp"), { recursive: true });
    writeFileSync(
      join(tmpDir, ".omp", "config.json"),
      JSON.stringify({ shared: "local", localOnly: "l" })
    );

    const { loadConfig } = await getConfig();
    const result = loadConfig<{ shared: string; globalOnly: string; localOnly: string }>("test");
    expect(result.shared).toBe("local");
    expect(result.globalOnly).toBe("g");
    expect(result.localOnly).toBe("l");

    rmSync(globalDir, { recursive: true, force: true });
  });

  it("merge returns global keys when local config is missing", async () => {
    const globalDir = mkdtempSync(join(tmpdir(), "omp-global-only-"));
    vi.mocked(osMod.homedir).mockReturnValue(globalDir);

    mkdirSync(join(globalDir, ".omp"), { recursive: true });
    writeFileSync(join(globalDir, ".omp", "config.json"), JSON.stringify({ fromGlobal: true }));

    const { loadConfig } = await getConfig();
    const result = loadConfig<{ fromGlobal: boolean }>("test");
    expect(result).toEqual({ fromGlobal: true });

    rmSync(globalDir, { recursive: true, force: true });
  });

  it("merge returns local keys when global config is missing", async () => {
    mkdirSync(join(tmpDir, ".omp"), { recursive: true });
    writeFileSync(join(tmpDir, ".omp", "config.json"), JSON.stringify({ fromLocal: true }));

    const { loadConfig } = await getConfig();
    const result = loadConfig<{ fromLocal: boolean }>("test");
    expect(result).toEqual({ fromLocal: true });
  });

  it("writeConfig creates file and directory when they do not exist", async () => {
    const { writeConfig, loadConfig } = await getConfig();
    writeConfig("test", "local", { hello: "world" });
    const result = loadConfig<{ hello: string }>("test", "local");
    expect(result).toEqual({ hello: "world" });
  });

  it("writeConfig merges patch with existing config", async () => {
    mkdirSync(join(tmpDir, ".omp"), { recursive: true });
    writeFileSync(join(tmpDir, ".omp", "config.json"), JSON.stringify({ a: 1, b: 2 }));
    const { writeConfig, loadConfig } = await getConfig();
    writeConfig("test", "local", { b: 99, c: 3 });
    const result = loadConfig<{ a: number; b: number; c: number }>("test", "local");
    expect(result).toEqual({ a: 1, b: 99, c: 3 });
  });

  it("writeConfig global creates file under homedir/.omp/config.json", async () => {
    const globalDir = mkdtempSync(join(tmpdir(), "omp-global-write-"));
    vi.mocked(osMod.homedir).mockReturnValue(globalDir);

    const { writeConfig, loadConfig } = await getConfig();
    writeConfig("test", "global", { gkey: "gval" });
    const result = loadConfig<{ gkey: string }>("test", "global");
    expect(result).toEqual({ gkey: "gval" });

    rmSync(globalDir, { recursive: true, force: true });
  });

  it("writeConfig writes valid pretty-printed JSON", async () => {
    const { writeConfig } = await getConfig();
    writeConfig("test", "local", { pretty: true });
    const raw = readFileSync(join(tmpDir, ".omp", "config.json"), "utf-8");
    expect(raw).toContain("\n");
    expect(JSON.parse(raw)).toEqual({ pretty: true });
  });
});
