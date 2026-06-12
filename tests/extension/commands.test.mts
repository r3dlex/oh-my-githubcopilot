/**
 * Unit tests for the pure command builder (src/extension/commands.mts):
 * alias expansion and activation-instruction handlers.
 */

import { describe, it, expect } from "vitest";

import {
  buildCommands,
  buildActivationInstruction,
} from "../../src/extension/commands.mts";
import type { SkillEntry } from "../../src/extension/registry.mts";

const REGISTRY: SkillEntry[] = [
  { id: "ultrawork", description: "Parallel implementation", aliases: ["ulw"] },
  { id: "ralph", description: "Persistence loop" },
];

describe("buildCommands", () => {
  it("expands aliases into separate command entries", () => {
    const commands = buildCommands(REGISTRY);
    expect(commands.map((c) => c.name)).toEqual(["ultrawork", "ulw", "ralph"]);
  });

  it("points alias descriptions at the canonical skill", () => {
    const ulw = buildCommands(REGISTRY).find((c) => c.name === "ulw");
    expect(ulw?.description).toContain("/ultrawork");
    expect(ulw?.description).toContain("Parallel implementation");
  });

  it("handler returns a string mentioning the canonical skill id and args", () => {
    const commands = buildCommands(REGISTRY);
    for (const command of commands) {
      const result = command.handler("--fast");
      expect(typeof result).toBe("string");
      expect(result).toContain("--fast");
    }
    const ulw = commands.find((c) => c.name === "ulw");
    expect(ulw?.handler("go")).toContain('"ultrawork"');
  });

  it("returns an empty list for an empty registry", () => {
    expect(buildCommands([])).toEqual([]);
  });
});

describe("buildActivationInstruction", () => {
  it("includes the skill id and trimmed args", () => {
    expect(buildActivationInstruction("ralph", "  fix the build  ")).toBe(
      'Activate the OMP skill "ralph" with args: fix the build',
    );
  });

  it("marks empty args as (none)", () => {
    expect(buildActivationInstruction("ralph", "   ")).toBe(
      'Activate the OMP skill "ralph" with args: (none)',
    );
  });
});
