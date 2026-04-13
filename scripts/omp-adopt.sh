#!/usr/bin/env bash
# omp-adopt.sh — Adopt OMP into a target project
#
# Usage:
#   ./scripts/omp-adopt.sh [--target <path>] [--mode template|submodule|subtree]
#
# Modes:
#   template   (default) Copy .github/ files into target project
#   submodule  Add as git submodule at .omp/ and symlink .github/ files
#   subtree    Add as git subtree

set -euo pipefail

OMP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="."
MODE="template"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET_DIR="$2"; shift 2 ;;
    --mode)   MODE="$2";       shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--target <path>] [--mode template|submodule|subtree]"
      exit 0 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

echo "OMP Adopt"
echo "  Source: $OMP_DIR"
echo "  Target: $TARGET_DIR"
echo "  Mode:   $MODE"
echo ""

case "$MODE" in
  template)
    echo "Copying .github/ workspace files..."
    mkdir -p "$TARGET_DIR/.github"
    cp -r "$OMP_DIR/.github/agents"    "$TARGET_DIR/.github/agents"
    cp -r "$OMP_DIR/.github/skills"    "$TARGET_DIR/.github/skills"
    cp -r "$OMP_DIR/.github/hooks"     "$TARGET_DIR/.github/hooks"
    cp    "$OMP_DIR/.github/copilot-instructions.md" "$TARGET_DIR/.github/copilot-instructions.md"
    echo "Done. OMP workspace files copied to $TARGET_DIR/.github/"
    echo ""
    echo "Optional: install MCP companion"
    echo "  npm install oh-my-githubcopilot"
    echo "  omp setup"
    ;;

  submodule)
    echo "Adding OMP as git submodule at .omp/ ..."
    cd "$TARGET_DIR"
    git submodule add https://github.com/r3dlex/oh-my-githubcopilot.git .omp
    mkdir -p .github
    ln -sfn ../.omp/.github/agents    .github/agents
    ln -sfn ../.omp/.github/skills    .github/skills
    ln -sfn ../.omp/.github/hooks     .github/hooks
    ln -sfn ../.omp/.github/copilot-instructions.md .github/copilot-instructions.md
    echo "Done. OMP added as submodule. Run 'git submodule update --init' to initialize."
    ;;

  subtree)
    echo "Adding OMP as git subtree at .omp/ ..."
    cd "$TARGET_DIR"
    git subtree add --prefix=.omp https://github.com/r3dlex/oh-my-githubcopilot.git main --squash
    mkdir -p .github
    cp -r .omp/.github/agents    .github/agents
    cp -r .omp/.github/skills    .github/skills
    cp -r .omp/.github/hooks     .github/hooks
    cp    .omp/.github/copilot-instructions.md .github/copilot-instructions.md
    echo "Done. OMP added as subtree."
    ;;

  *)
    echo "Unknown mode: $MODE. Use template, submodule, or subtree."
    exit 1 ;;
esac
