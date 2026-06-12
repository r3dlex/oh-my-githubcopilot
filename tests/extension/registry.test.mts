/**
 * Integrity tests for the OMP skill registry (src/extension/registry.mts):
 * it must stay in lockstep with plugin.json's skills array and never
 * produce duplicate slash-command names.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, basename } from "path";

import {
  SKILL_REGISTRY,
  getCommandDefinitions,
} from "../../src/extension/registry.mts";

const pluginJson = JSON.parse(
  readFileSync(join(__dirname, "../../plugin.json"), "utf8"),
) as {
  skills: string[];
};
const pluginSkillIds = pluginJson.skills.map((p) => basename(p));

describe("SKILL_REGISTRY", () => {
  it("contains every skill listed in plugin.json", () => {
    const registryIds = SKILL_REGISTRY.map((e) => e.id);
    for (const id of pluginSkillIds) {
      expect(registryIds).toContain(id);
    }
  });

  it("contains no skills that are absent from plugin.json", () => {
    for (const entry of SKILL_REGISTRY) {
      expect(pluginSkillIds).toContain(entry.id);
    }
  });

  it("has no duplicate ids", () => {
    const ids = SKILL_REGISTRY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no duplicate command names across ids and aliases", () => {
    const names = SKILL_REGISTRY.flatMap((e) => [e.id, ...(e.aliases ?? [])]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("has a non-empty description for every skill", () => {
    for (const entry of SKILL_REGISTRY) {
      expect(entry.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("defines the spec §4 aliases", () => {
    const aliasMap = new Map(
      SKILL_REGISTRY.flatMap((e) =>
        (e.aliases ?? []).map((a) => [a, e.id] as const),
      ),
    );
    expect(aliasMap.get("ulw")).toBe("ultrawork");
    expect(aliasMap.get("eco")).toBe("ecomode");
    expect(aliasMap.get("plan")).toBe("omp-plan");
    expect(aliasMap.get("di")).toBe("deep-interview");
  });
});

describe("getCommandDefinitions", () => {
  it("returns one command per skill id plus one per alias", () => {
    const expected = SKILL_REGISTRY.reduce(
      (n, e) => n + 1 + (e.aliases?.length ?? 0),
      0,
    );
    expect(getCommandDefinitions()).toHaveLength(expected);
  });
});
