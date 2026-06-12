/**
 * HUD canvas metadata and pure formatting for the Copilot SDK Canvas API
 * (SPEC-omp-2.0 §5 renderer #1, ADR-0002).
 *
 * The SDK shapes are declared structurally on purpose:
 * `@github/copilot-sdk` is resolved by the Copilot CLI inside extension
 * processes only and is NOT a package.json dependency of this repo.
 * `extension/extension.mjs` mirrors this module in a self-contained form;
 * parity is enforced by tests/extension/extension-parity.test.mts.
 */

import { DEFAULT_STATUSLINE } from "../hud/statusline.mts";

/**
 * Canvas id, unique within the extension connection. Must not start with
 * `canvas.` — that prefix is reserved for SDK lifecycle verbs.
 */
export const HUD_CANVAS_ID = "omp-hud";

/** Human-readable label shown in discovery and host UI chrome. */
export const HUD_CANVAS_DISPLAY_NAME = "OMP HUD";

/** Single-sentence description shown to the agent in canvas catalogs. */
export const HUD_CANVAS_DESCRIPTION =
  "Live OMP session HUD: mode, model, context, tokens, premium requests, and agent activity.";

/** Minimal structural shape of the SDK CanvasOpenResponse. */
export interface HudCanvasOpenResponse {
  title: string;
  status: string;
}

/**
 * Maps a rendered HUD line (renderPlain output, i.e. the content of
 * ~/.omp/hud/display.txt) to the CanvasOpenResponse the host renders.
 * Pure — mirrored verbatim in extension/extension.mjs.
 */
export function buildHudCanvasResponse(line: string): HudCanvasOpenResponse {
  const trimmed = typeof line === "string" ? line.trim() : "";
  return {
    title: HUD_CANVAS_DISPLAY_NAME,
    status: trimmed.length > 0 ? trimmed : DEFAULT_STATUSLINE,
  };
}
