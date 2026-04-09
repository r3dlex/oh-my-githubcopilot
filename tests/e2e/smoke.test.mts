/**
 * E2E Smoke Tests
 */

import { describe, it, expect } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const BIN = "./bin/omp.mjs";

async function run(args: string): Promise<{ stdout: string; exitCode: number }> {
  try {
    const { stdout } = await execAsync(`node ${BIN} ${args}`, { timeout: 10_000 });
    return { stdout, exitCode: 0 };
  } catch (err: unknown) {
    const code = (err as { code?: number }).code ?? 1;
    return { stdout: "", exitCode: typeof code === "number" ? code : 1 };
  }
}

describe("CLI smoke tests", () => {
  it("should execute without crashing", async () => {
    const { stdout, exitCode } = await run("");
    expect(stdout).toBeDefined();
    expect(stdout.length).toBeGreaterThan(0);
    expect(exitCode).toBe(0);
  });

  it("should respond to the version subcommand", async () => {
    const { stdout, exitCode } = await run("version");
    expect(stdout).toContain("oh-my-copilot");
    expect(stdout).toMatch(/v\d+\.\d+\.\d+/);
    expect(exitCode).toBe(0);
  });

  it("should respond to the hud subcommand without error", async () => {
    const { stdout, exitCode } = await run("hud");
    expect(stdout).toBeDefined();
    expect(stdout.length).toBeGreaterThan(0);
    expect(exitCode).toBe(0);
  });

  it("should exit with code 1 for an unknown subcommand", async () => {
    const { exitCode } = await run("nonexistent-subcommand");
    expect(exitCode).toBe(1);
  });

  it("should respond to the psm subcommand", async () => {
    const { stdout, exitCode } = await run("psm");
    expect(stdout).toContain("PSM");
    expect(exitCode).toBe(0);
  });

  it("should respond to the bench subcommand", async () => {
    const { stdout, exitCode } = await run("bench");
    expect(stdout).toContain("SWE-bench");
    expect(exitCode).toBe(0);
  });
});
