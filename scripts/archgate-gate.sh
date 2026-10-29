#!/usr/bin/env bash
# Archgate ADR gate — CI's blocking check that the ADRs are actually enforced.
#
# `archgate check` exits 0 when there is nothing to check. Every ADR in this
# repository used to declare `rules: false` with no companion `.rules.ts`, so
# the command printed "No rules to check." and exited 0: a gate that verified
# nothing and reported success. A version mismatch is equally silent, because
# `archgate --version` only prints.
#
# This script asserts the two things that make the gate meaningful:
#
#   1. the archgate binary is the expected version, and
#   2. the run actually checked at least one rule (the JSON report's `total`
#      is greater than zero).
#
# Both assertions FAIL the step. A gate that checks nothing fails; it does
# not pass quietly.
#
# Environment:
#   EXPECTED_ARCHGATE_VERSION  required — the pinned archgate version, e.g. "0.60.0"
#   ARCHGATE_BIN               optional — path to the archgate binary (default: archgate)
#   ARCHGATE_REPORT            optional — path for the JSON report (default: archgate-report.json)
set -euo pipefail

EXPECTED_ARCHGATE_VERSION="${EXPECTED_ARCHGATE_VERSION:-}"
ARCHGATE_BIN="${ARCHGATE_BIN:-archgate}"
ARCHGATE_REPORT="${ARCHGATE_REPORT:-archgate-report.json}"

fail() {
  echo "::error::$1"
  exit 1
}

if [ -z "$EXPECTED_ARCHGATE_VERSION" ]; then
  fail "EXPECTED_ARCHGATE_VERSION is not set — the archgate version must be pinned repo-side"
fi

if ! command -v "$ARCHGATE_BIN" >/dev/null 2>&1; then
  fail "archgate not found on PATH (override with ARCHGATE_BIN) — upstream publishes no linux/arm64 release, so the fleet's source-built binary is required"
fi

actual="$("$ARCHGATE_BIN" --version 2>/dev/null | tr -d '[:space:]' || true)"
if [ "$actual" != "$EXPECTED_ARCHGATE_VERSION" ]; then
  fail "archgate version mismatch: expected $EXPECTED_ARCHGATE_VERSION, got ${actual:-<none>}"
fi

status=0
"$ARCHGATE_BIN" check --output json > "$ARCHGATE_REPORT" || status=$?

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

echo "archgate $actual checked $total rule(s)"

if [ "$status" -ne 0 ]; then
  fail "archgate reported rule violations (exit $status) — see $ARCHGATE_REPORT"
fi
