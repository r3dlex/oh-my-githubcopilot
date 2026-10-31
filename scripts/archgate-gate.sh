#!/usr/bin/env bash
# Archgate ADR gate — CI's blocking check that the ADRs are actually enforced.
#
# `archgate check` exits 0 when there is nothing to check. Every ADR in this
# repository used to declare `rules: false` with no companion `.rules.ts`, so
# the command printed "No rules to check." and exited 0: a gate that verified
# nothing and reported success. A version mismatch is equally silent, because
# `archgate --version` only prints.
#
# This script asserts the three things that make the gate meaningful:
#
#   1. the binary that is about to run is the one the repository pins — by
#      SHA256, per platform. The fleet's runners are persistent and shared by
#      every repository in the organisation, and their $HOME (and therefore
#      ~/.archgate/bin) is writable by every job that runs on them, so a
#      replaced binary would otherwise silently neuter the gate for everyone.
#      A version string cannot detect that: a replaced binary prints whatever
#      it likes.
#   2. that binary is the version the repository declares. The version lives
#      in package.json and NOWHERE ELSE — the workflows used to carry a
#      second literal, which is how package.json (archgate ^0.27.0) and CI
#      (0.60.0) drifted apart.
#   3. the run actually checked at least one rule (the JSON report's `total`
#      is greater than zero).
#
# All three assertions FAIL the step. A gate that checks nothing fails; it
# does not pass quietly.
#
# The binary is copied into a private directory and the COPY is executed, so
# the bytes that run are exactly the bytes that were verified — not whatever
# is at the shared path by the time the check runs.
#
# Environment:
#   ARCHGATE_BIN               optional — path to the archgate binary
#                               (default: `archgate` on PATH, then
#                               $HOME/.archgate/bin/archgate)
#   ARCHGATE_REPORT            optional — path for the JSON report
#                               (default: archgate-report.json)
#   ARCHGATE_DIGESTS           optional — path to the digest pin file
#                               (default: <repo>/.archgate/archgate-digests.json)
#   ARCHGATE_PACKAGE_JSON      optional — path to package.json
#                               (default: <repo>/package.json)
#   EXPECTED_ARCHGATE_SHA256   optional — override the pinned digest
#                               (used by the tests; CI uses the pin file)
set -euo pipefail

ARCHGATE_BIN="${ARCHGATE_BIN:-}"
ARCHGATE_REPORT="${ARCHGATE_REPORT:-archgate-report.json}"
EXPECTED_ARCHGATE_SHA256="${EXPECTED_ARCHGATE_SHA256:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ARCHGATE_DIGESTS="${ARCHGATE_DIGESTS:-$REPO_ROOT/.archgate/archgate-digests.json}"
ARCHGATE_PACKAGE_JSON="${ARCHGATE_PACKAGE_JSON:-$REPO_ROOT/package.json}"

fail() {
  echo "::error::$1"
  exit 1
}

# The platform key the digest pin file is keyed by.
platform_key() {
  local os arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"
  case "$arch" in
    x86_64 | amd64) arch="x64" ;;
    aarch64 | arm64) arch="arm64" ;;
  esac
  printf '%s-%s\n' "$os" "$arch"
}

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

# ---------------------------------------------------------------------------
# 1. The declared version — package.json is the single source of truth.
# ---------------------------------------------------------------------------
if [ ! -f "$ARCHGATE_PACKAGE_JSON" ]; then
  fail "package.json not found at $ARCHGATE_PACKAGE_JSON — the declared archgate version cannot be read"
fi

expected_version="$(node -p "require(process.argv[1]).devDependencies.archgate" "$ARCHGATE_PACKAGE_JSON" 2>/dev/null || true)"
if [ -z "$expected_version" ]; then
  fail "package.json does not declare a devDependency named archgate — the ADR gate has no version to enforce"
fi
if printf '%s' "$expected_version" | grep -qE '[~^><=*[:space:]]'; then
  fail "package.json declares archgate as '$expected_version' — it must be an EXACT version, or CI and 'npm run archgate:check' can drift apart again"
fi

# ---------------------------------------------------------------------------
# 2. The binary — resolve it, then verify the bytes we are about to run.
# ---------------------------------------------------------------------------
resolved_bin=""
if [ -n "$ARCHGATE_BIN" ]; then
  resolved_bin="$ARCHGATE_BIN"
elif command -v archgate >/dev/null 2>&1; then
  resolved_bin="$(command -v archgate)"
elif [ -x "${HOME:-/nonexistent}/.archgate/bin/archgate" ]; then
  resolved_bin="$HOME/.archgate/bin/archgate"
fi

if [ -z "$resolved_bin" ] || [ ! -x "$resolved_bin" ]; then
  fail "archgate not found (override with ARCHGATE_BIN) — upstream publishes no linux/arm64 release asset, so the fleet's source-built binary is required"
fi

# Copy first, then verify the copy: the bytes that are verified are exactly
# the bytes that are executed.
workdir="$(mktemp -d "${TMPDIR:-/tmp}/archgate-gate.XXXXXX")"
trap 'rm -rf "$workdir"' EXIT
cp "$resolved_bin" "$workdir/archgate"
chmod 0755 "$workdir/archgate"

actual_digest="$(sha256_of "$workdir/archgate")"

platform="$(platform_key)"
if [ -n "$EXPECTED_ARCHGATE_SHA256" ]; then
  pinned_digest="$EXPECTED_ARCHGATE_SHA256"
elif [ ! -f "$ARCHGATE_DIGESTS" ]; then
  fail "digest pin file not found at $ARCHGATE_DIGESTS — the ADR gate must verify the archgate binary it executes"
else
  pinned_digest="$(node -e '
    const fs = require("node:fs");
    const pins = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const entry = pins[process.argv[2]];
    const value = typeof entry === "string" ? entry : entry?.sha256;
    if (typeof value !== "string" || value.length === 0) process.exit(1);
    process.stdout.write(value);
  ' "$ARCHGATE_DIGESTS" "$platform" 2>/dev/null || true)"
  if [ -z "$pinned_digest" ]; then
    fail "no archgate digest is pinned for platform '$platform' in $ARCHGATE_DIGESTS — refusing to run an unverified binary"
  fi
fi

if [ "$actual_digest" != "$pinned_digest" ]; then
  fail "archgate digest mismatch on $platform: expected $pinned_digest, got $actual_digest (binary: $resolved_bin) — a shared runner's binary was replaced or rebuilt; re-pin it in $ARCHGATE_DIGESTS if the change is expected"
fi

actual_version="$("$workdir/archgate" --version 2>/dev/null | tr -d '[:space:]' || true)"
if [ "$actual_version" != "$expected_version" ]; then
  fail "archgate version mismatch: package.json declares $expected_version, got ${actual_version:-<none>}"
fi

# ---------------------------------------------------------------------------
# 3. The run itself — it must have checked at least one rule.
# ---------------------------------------------------------------------------
status=0
"$workdir/archgate" check --output json > "$ARCHGATE_REPORT" || status=$?

if [ ! -s "$ARCHGATE_REPORT" ]; then
  fail "archgate produced no JSON report at $ARCHGATE_REPORT"
fi

total="$(node -p "JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8')).total" "$ARCHGATE_REPORT" 2>/dev/null || true)"
case "$total" in
  "" | *[!0-9]*)
    fail "could not read a numeric 'total' from $ARCHGATE_REPORT"
    ;;
esac

if [ "$total" -le 0 ]; then
  fail "archgate checked 0 rules — the ADR gate is vacuous"
fi

echo "archgate $actual_version ($actual_digest) checked $total rule(s)"

if [ "$status" -ne 0 ]; then
  fail "archgate reported rule violations (exit $status) — see $ARCHGATE_REPORT"
fi
