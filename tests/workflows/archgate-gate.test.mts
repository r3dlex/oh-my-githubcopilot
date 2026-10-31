/**
 * Archgate ADR gate tests.
 *
 * The CI gate is only meaningful if it FAILS when there is nothing to check.
 * `archgate check` exits 0 both when every rule passes and when it checked
 * no rule at all, so the gate has to assert the report's rule count itself.
 *
 * The gate also has to assert WHICH binary ran. A version string is not a
 * pin: the fleet's runners are persistent and shared by every repository in
 * the organisation, so a replaced binary prints whatever version it likes.
 * The gate therefore verifies the SHA256 of the binary against a digest
 * pinned in the repository, and executes a verified COPY of it.
 *
 * These tests drive scripts/archgate-gate.sh with a stub archgate binary so
 * every failure mode is exercised without needing archgate installed.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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
const REPO_PACKAGE_JSON = resolve("package.json");

interface StubOptions {
  version: string;
  /** Exactly what the stub prints for `check --output json`. */
  report: string;
  exitCode: number;
}

/**
 * A stand-in for the archgate binary: `--version` prints the configured
 * version, `check --output json` prints the configured report and exits with
 * the configured code. Every invocation appends the path it was executed
 * from to $ARCHGATE_MARKER, so a test can prove which bytes ran.
 */
function writeStub(dir: string, options: StubOptions): string {
  const stub = join(dir, "archgate-stub.sh");
  writeFileSync(
    stub,
    [
      "#!/usr/bin/env bash",
      'if [ -n "${ARCHGATE_MARKER:-}" ]; then',
      "  if command -v sha256sum >/dev/null 2>&1; then",
      '    digest=$(sha256sum "$0" | cut -d" " -f1)',
      "  else",
      '    digest=$(shasum -a 256 "$0" | cut -d" " -f1)',
      "  fi",
      '  printf "%s %s\\n" "$0" "$digest" >> "$ARCHGATE_MARKER"',
      "fi",
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

function sha256Of(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/** The platform key the digest pin file is keyed by. */
function platformKey(): string {
  const arch =
    process.arch === "x64" ? "x64" : process.arch === "arm64" ? "arm64" : process.arch;
  return `${process.platform}-${arch}`;
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
      EXPECTED_ARCHGATE_SHA256: sha256Of(stub),
    });

    expect(status).toBe(0);
    expect(output).toContain("checked 2 rule(s)");
  });

  it("FAILS when the binary's digest does not match the pin", () => {
    stub = writeStub(workdir, {
      version: "0.60.0",
      report: JSON.stringify({ pass: true, total: 2, passed: 2, failed: 0 }),
      exitCode: 0,
    });

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_SHA256: "0".repeat(64),
    });

    expect(status).not.toBe(0);
    expect(output).toContain("digest mismatch");
  });

  it("FAILS when no digest is pinned for the platform", () => {
    stub = writeStub(workdir, {
      version: "0.60.0",
      report: JSON.stringify({ pass: true, total: 2, passed: 2, failed: 0 }),
      exitCode: 0,
    });

    const pins = join(workdir, "pins.json");
    writeFileSync(pins, JSON.stringify({ "some-other-platform": "a".repeat(64) }));

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_SHA256: undefined,
      ARCHGATE_DIGESTS: pins,
    });

    expect(status).not.toBe(0);
    expect(output).toContain("refusing to run an unverified binary");
  });

  it("FAILS when the digest pin file is missing", () => {
    stub = writeStub(workdir, {
      version: "0.60.0",
      report: JSON.stringify({ pass: true, total: 2, passed: 2, failed: 0 }),
      exitCode: 0,
    });

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_SHA256: undefined,
      ARCHGATE_DIGESTS: join(workdir, "does-not-exist.json"),
    });

    expect(status).not.toBe(0);
    expect(output).toContain("digest pin file not found");
  });

  it("reads the pinned digest from the pin file for this platform", () => {
    stub = writeStub(workdir, {
      version: "0.60.0",
      report: JSON.stringify({ pass: true, total: 2, passed: 2, failed: 0 }),
      exitCode: 0,
    });

    const pins = join(workdir, "pins.json");
    writeFileSync(
      pins,
      JSON.stringify({ [platformKey()]: { sha256: sha256Of(stub) } }),
    );

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_SHA256: undefined,
      ARCHGATE_DIGESTS: pins,
    });

    expect(status).toBe(0);
    expect(output).toContain("checked 2 rule(s)");
  });

  it("executes a verified COPY, not the binary at the shared path", () => {
    stub = writeStub(workdir, {
      version: "0.60.0",
      report: JSON.stringify({ pass: true, total: 2, passed: 2, failed: 0 }),
      exitCode: 0,
    });

    const marker = join(workdir, "invocations.txt");
    const { status } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_SHA256: sha256Of(stub),
      ARCHGATE_MARKER: marker,
    });

    expect(status).toBe(0);
    const invocations = readFileSync(marker, "utf8").trim().split("\n");
    expect(invocations.length).toBeGreaterThan(0);
    for (const invocation of invocations) {
      const [path, digest] = invocation.split(" ");
      // The bytes that ran are the bytes that were verified, and they ran
      // from a private copy — not from the shared path the runner exposes.
      expect(path).not.toBe(stub);
      expect(path).toMatch(/archgate-gate\.[A-Za-z0-9]+\/archgate$/u);
      expect(digest).toBe(sha256Of(stub));
    }
  });

  it("takes the expected version from package.json, not from the environment", () => {
    stub = writeStub(workdir, {
      version: "0.60.0",
      report: JSON.stringify({ pass: true, total: 2, passed: 2, failed: 0 }),
      exitCode: 0,
    });

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_SHA256: sha256Of(stub),
      // A second source of truth would be exactly the drift this gate
      // exists to prevent, so the variable is ignored.
      EXPECTED_ARCHGATE_VERSION: "9.9.9",
    });

    expect(status).toBe(0);
    expect(output).toContain("checked 2 rule(s)");
  });

  it("FAILS when the archgate version does not match package.json", () => {
    stub = writeStub(workdir, {
      version: "0.61.0",
      report: JSON.stringify({ pass: true, total: 2, passed: 2, failed: 0 }),
      exitCode: 0,
    });

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_SHA256: sha256Of(stub),
    });

    expect(status).not.toBe(0);
    expect(output).toContain("version mismatch");
  });

  it("FAILS when package.json declares a version RANGE instead of an exact one", () => {
    stub = writeStub(workdir, {
      version: "0.60.0",
      report: JSON.stringify({ pass: true, total: 2, passed: 2, failed: 0 }),
      exitCode: 0,
    });

    const packageJson = join(workdir, "package.json");
    writeFileSync(
      packageJson,
      JSON.stringify({ devDependencies: { archgate: "^0.60.0" } }),
    );

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_SHA256: sha256Of(stub),
      ARCHGATE_PACKAGE_JSON: packageJson,
    });

    expect(status).not.toBe(0);
    expect(output).toContain("EXACT version");
  });

  it("FAILS when archgate checked zero rules — the vacuous gate", () => {
    stub = writeStub(workdir, {
      version: "0.60.0",
      report: JSON.stringify({ pass: true, total: 0, passed: 0, failed: 0 }),
      exitCode: 0,
    });

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_SHA256: sha256Of(stub),
    });

    expect(status).not.toBe(0);
    expect(output).toContain("vacuous");
  });

  it("FAILS when archgate reports rule violations", () => {
    stub = writeStub(workdir, {
      version: "0.60.0",
      report: JSON.stringify({ pass: false, total: 2, passed: 1, failed: 1 }),
      exitCode: 2,
    });

    const { status, output } = runGate(stub, workdir, {
      EXPECTED_ARCHGATE_SHA256: sha256Of(stub),
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
      EXPECTED_ARCHGATE_SHA256: sha256Of(stub),
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
      EXPECTED_ARCHGATE_SHA256: sha256Of(stub),
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
      EXPECTED_ARCHGATE_SHA256: sha256Of(stub),
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

  it("gives every companion a default-exported RuleSet", () => {
    for (const adr of adrFiles) {
      const companion = companionOf(adr);
      if (!existsSync(companion)) continue;
      const source = readFileSync(companion, "utf8");
      expect(source, companion).toContain("satisfies RuleSet");
      expect(source, companion).toContain("export default");
    }
  });

  it("gives every companion the reference directive archgate's syntax check requires", () => {
    // archgate 0.60.0 has a built-in `syntax-check` rule that reports
    // "Missing triple-slash reference directive" as an ERROR, and
    // `archgate check` then exits non-zero. The directive points at
    // `.archgate/rules.d.ts`, which `archgate init` generates and which is
    // gitignored on purpose: it is a TypeScript compiler hint, and archgate
    // loads the companion at runtime without typechecking it, so a fresh
    // clone (no generated file) still passes the gate.
    for (const adr of adrFiles) {
      const companion = companionOf(adr);
      if (!existsSync(companion)) continue;
      const source = readFileSync(companion, "utf8");
      expect(source, companion).toContain('/// <reference path="../rules.d.ts" />');
      expect(
        source.split("\n")[0],
        `${companion}: the directive has to be the first line for archgate's syntax check`,
      ).toBe('/// <reference path="../rules.d.ts" />');
    }
  });
});

describe("archgate pin", () => {
  it("declares an EXACT archgate version in package.json", () => {
    const pkg = JSON.parse(readFileSync(REPO_PACKAGE_JSON, "utf8"));
    const declared = pkg.devDependencies?.archgate;

    expect(declared, "package.json does not pin archgate").toBeTruthy();
    expect(declared).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("pins a digest for every platform CI runs the ADR gate on", () => {
    const pkg = JSON.parse(readFileSync(REPO_PACKAGE_JSON, "utf8"));
    const pins = JSON.parse(
      readFileSync(resolve(".archgate/archgate-digests.json"), "utf8"),
    );

    // linux-arm64 is the self-hosted fleet; linux-x64 is the GitHub-hosted
    // runner the release test leg runs on.
    for (const platform of ["linux-arm64", "linux-x64"]) {
      const entry = pins[platform];
      expect(entry, `no digest pinned for ${platform}`).toBeTruthy();
      expect(entry.sha256, platform).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.version, platform).toBe(pkg.devDependencies.archgate);
    }
  });
});
