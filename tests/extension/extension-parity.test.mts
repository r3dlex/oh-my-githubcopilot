/**
 * Drift guard: the self-contained COMMANDS list in extension/extension.mjs
 * must stay in exact sync (order, names, descriptions, skill ids) with
 * getCommandDefinitions() built from src/extension/registry.mts.
 *
 * Importing extension.mjs must NOT trigger joinSession — main() only runs
 * when the file is executed directly.
 */

import { describe, it, expect } from "vitest";

import { getCommandDefinitions } from "../../src/extension/registry.mts";
import { buildActivationInstruction } from "../../src/extension/commands.mts";
// @ts-expect-error — plain .mjs module without type declarations
import {
  COMMANDS,
  buildActivationInstruction as mjsInstruction,
} from "../../extension/extension.mjs";

interface InlineCommand {
  name: string;
  skillId: string;
  description: string;
}

const inline = COMMANDS as InlineCommand[];
const definitions = getCommandDefinitions();

describe("extension.mjs ↔ registry parity", () => {
  it("has the same command names in the same order", () => {
    expect(inline.map((c) => c.name)).toEqual(definitions.map((d) => d.name));
  });

  it("has identical descriptions per command", () => {
    expect(
      inline.map((c) => ({ name: c.name, description: c.description })),
    ).toEqual(
      definitions.map((d) => ({ name: d.name, description: d.description })),
    );
  });

  it("targets the same skill id per command as the registry handlers", () => {
    for (const [i, def] of definitions.entries()) {
      expect(def.handler("probe-args")).toBe(
        buildActivationInstruction(inline[i].skillId, "probe-args"),
      );
    }
  });

  it("produces identical activation instructions in both implementations", () => {
    expect(mjsInstruction("ralph", "  go  ")).toBe(
      buildActivationInstruction("ralph", "  go  "),
    );
    expect(mjsInstruction("ralph", "")).toBe(
      buildActivationInstruction("ralph", ""),
    );
  });
});
