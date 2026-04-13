#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENTRY="$SCRIPT_DIR/omp-statusline.mjs"
DISPLAY_PATH="${OMP_HUD_DISPLAY_PATH:-$HOME/.omp/hud/display.txt}"
LEGACY_PATH="${OMP_HUD_LEGACY_PATH:-$HOME/.omp/hud.line}"

if [[ -f "$ENTRY" ]]; then
  exec node "$ENTRY" "$@"
fi

if [[ -r "$DISPLAY_PATH" ]]; then
  exec cat "$DISPLAY_PATH"
fi

if [[ -r "$LEGACY_PATH" ]]; then
  exec cat "$LEGACY_PATH"
fi

printf 'OMP | hud: no active session\n'
