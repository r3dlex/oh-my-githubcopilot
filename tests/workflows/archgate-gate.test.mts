/**
 * Archgate ADR gate tests.
 *
 * The CI gate is only meaningful if it FAILS when there is nothing to check.
 * `archgate check` exits 0 both when every rule passes and when it checked
 * no rule at all, so the gate has to assert the report's rule count itself.
 *
 * These tests drive scripts/archgate-gate.sh with a stub archgate binary so
 * every failure mode is exercised without needing archgate installed.
 */

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const GATE_SCRIPT = resolve("scripts/archgate-gate.sh");
const ADR_DIR = resolve(".archgate/adrs");

interface StubOptions {
  version: string;
  /** Exactly what the stub prints for `check --output json`. */
  report: string;
  exitCode: number;
}

/**
 * A stand-in for the archgate binary: `--version` prints the configured
 * version, `check --output json` prints the configured report and exits with
 * the configured code.
 */
function writeStub(dir: string, options: StubOptions): string {
  const stub = join(dir, "archgate-stub.sh");
  writeFileSync(
    stub,
    [
      "#!/usr/bin/env bash",
      'if [ "$1" = "--version" ]; then',
      `  printf '%s\\n' ${JSON.stringify(options.version)}`,
      "  exit 0",
      "fi",
      `printf '%s' ${JSON.stringify(options.report)}`,
      `exit ${options.exitCode}`,
      "",
    ].join("\n"),
  );
  chmodSync(stub, 0o755);
  return stub;
}

function runGate(
  stub: string,
  cwd: string,
  env: Record<string, string | undefined>,
): { status: number | null; output: string } {
  const result = spawnSync("bash", [GATE_SCRIPT], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ARCHGATE_BIN: stub,
      ARCHGATE_REPORT: "archgate-report.json",
      ...env,
    },
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

describe("archgate gate", () => {
  let workdir: string;
  let stub: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), "archgate-gate-"));
  });

  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  it("passes when the version matches and rules were checked", () => {
    stub = writeStub(workdir, {
      version: "0.60.0",
      report: JSON.stringify({ pass: true, total: 2, passed: 2, failed: 0 }),
      exitCode: 0,
    });

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_VERSION: "0.60.0",
    });

    expect(status).toBe(0);
    expect(output).toContain("checked 2 rule(s)");
  });

  it("FAILS when archgate checked zero rules — the vacuous gate", () => {
    stub = writeStub(workdir, {
      version: "0.60.0",
      report: JSON.stringify({ pass: true, total: 0, passed: 0, failed: 0 }),
      exitCode: 0,
    });

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_VERSION: "0.60.0",
    });

    expect(status).not.toBe(0);
    expect(output).toContain("vacuous");
  });

  it("FAILS when the archgate version does not match the pin", () => {
    stub = writeStub(workdir, {
      version: "0.61.0",
      report: JSON.stringify({ pass: true, total: 2, passed: 2, failed: 0 }),
      exitCode: 0,
    });

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_VERSION: "0.60.0",
    });

    expect(status).not.toBe(0);
    expect(output).toContain("version mismatch");
  });

  it("FAILS when the expected version is unset", () => {
    stub = writeStub(workdir, {
      version: "0.60.0",
      report: JSON.stringify({ pass: true, total: 2, passed: 2, failed: 0 }),
      exitCode: 0,
    });

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_VERSION: undefined,
    });

    expect(status).not.toBe(0);
    expect(output).toContain("EXPECTED_ARCHGATE_VERSION is not set");
  });

  it("FAILS when archgate reports rule violations", () => {
    stub = writeStub(workdir, {
      version: "0.60.0",
      report: JSON.stringify({ pass: false, total: 2, passed: 1, failed: 1 }),
      exitCode: 2,
    });

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_VERSION: "0.60.0",
    });

    expect(status).not.toBe(0);
    expect(output).toContain("rule violations");
  });

  it("FAILS when archgate produces no report", () => {
    stub = writeStub(workdir, {
      version: "0.60.0",
      report: "",
      exitCode: 0,
    });

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_VERSION: "0.60.0",
    });

    expect(status).not.toBe(0);
    expect(output).toContain("no JSON report");
  });

  it("FAILS when the report has no numeric rule count", () => {
    stub = writeStub(workdir, {
      version: "0.60.0",
      report: JSON.stringify({ pass: true }),
      exitCode: 0,
    });

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_VERSION: "0.60.0",
    });

    expect(status).not.toBe(0);
    expect(output).toContain("numeric 'total'");
  });

  it("reads the report from an absolute ARCHGATE_REPORT path", () => {
    stub = writeStub(workdir, {
      version: "0.60.0",
      report: JSON.stringify({ pass: true, total: 3, passed: 3, failed: 0 }),
      exitCode: 0,
    });

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_VERSION: "0.60.0",
      ARCHGATE_REPORT: join(workdir, "report.json"),
    });

    expect(status).toBe(0);
    expect(output).toContain("checked 3 rule(s)");
  });
});

describe("archgate ADR wiring", () => {
  const adrFiles = readdirSync(ADR_DIR).filter((name) => name.endsWith(".md"));

  function frontmatter(adr: string): string {
    const body = readFileSync(join(ADR_DIR, adr), "utf8");
    const match = /^---\n([\s\S]*?)\n---/.exec(body);
    return match?.[1] ?? "";
  }

  function companionOf(adr: string): string {
    return join(ADR_DIR, adr.replace(/\.md$/, ".rules.ts"));
  }

  it("has at least one ADR", () => {
    expect(adrFiles.length).toBeGreaterThan(0);
  });

  it("declares at least one ADR with executable rules", () => {
    const enforced = adrFiles.filter((adr) =>
      /^rules:\s*true$/m.test(frontmatter(adr)),
    );

    expect(
      enforced.length,
      "no ADR declares `rules: true`, so `archgate check` has nothing to check",
    ).toBeGreaterThan(0);
  });

  it("gives every rules:true ADR a companion .rules.ts", () => {
    for (const adr of adrFiles) {
      if (!/^rules:\s*true$/m.test(frontmatter(adr))) continue;
      expect(
        existsSync(companionOf(adr)),
        `${adr} declares rules: true but has no companion`,
      ).toBe(true);
    }
  });

  it("gives every companion the reference directive archgate 0.60.0 requires", () => {
    for (const adr of adrFiles) {
      const companion = companionOf(adr);
      if (!existsSync(companion)) continue;
      const source = readFileSync(companion, "utf8");
      expect(source, companion).toContain('/// <reference path="../rules.d.ts" />');
      expect(source, companion).toContain("satisfies RuleSet");
    }
  });
});
