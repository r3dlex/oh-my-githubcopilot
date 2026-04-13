#!/bin/bash
# OMP Pre-Tool-Use Hook
# Reads JSON from stdin, writes JSON to stdout
# Environment: TOOL_NAME, TOOL_INPUT, WORKSPACE

TOOL_NAME="${TOOL_NAME:-}"
TOOL_INPUT="${TOOL_INPUT:-}"

# Guard: prevent modifications to node_modules
if echo "$TOOL_INPUT" | grep -q "node_modules"; then
  if [ "$TOOL_NAME" = "editFiles" ] || [ "$TOOL_NAME" = "createFile" ]; then
    echo '{"decision": "deny", "reason": "Modifying node_modules is not allowed."}'
    exit 0
  fi
fi

# Allow everything else
echo '{"decision": "approve"}'
