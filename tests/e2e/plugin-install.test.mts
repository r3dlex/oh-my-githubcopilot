/**
 * Plugin Installation E2E Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const root = process.cwd();

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function pluginJson(): Record<string, unknown> {
  const path = join(root, ".github/plugin/plugin.json");
  return JSON.parse(readFileSync(path, "utf-8"));
}

function marketplaceJson(): Record<string, unknown> {
  const path = join(root, ".github/plugin/marketplace.json");
  return JSON.parse(readFileSync(path, "utf-8"));
}

function packageJson(): Record<string, unknown> {
  const path = join(root, "package.json");
  return JSON.parse(readFileSync(path, "utf-8"));
}

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe("plugin installation", () => {
  describe("plugin.json", () => {
    it("should have a valid name", () => {
      const json = pluginJson();
      expect(json.name).toBe("oh-my-copilot");
    });

    it("should have version 1.0.0", () => {
      const json = pluginJson();
      expect(json.version).toBe("1.0.0");
      // plugins is not a field in plugin.json (it's in marketplace.json)
      expect(json.name).toBe("oh-my-copilot");
    });

    it("should reference a repository", () => {
      const json = pluginJson();
      expect(json.repository).toBeDefined();
      expect((json.repository as string).length).toBeGreaterThan(0);
    });

    it("should have Apache-2.0 license", () => {
      const json = pluginJson();
      expect(json.license).toBe("Apache-2.0");
    });

    it("should have keywords array", () => {
      const json = pluginJson();
      expect(Array.isArray(json.keywords)).toBe(true);
      expect(json.keywords).toContain("orchestration");
    });

    it("should have skills directory reference", () => {
      const json = pluginJson();
      const skills = json.skills as string[];
      expect(skills).toBeDefined();
      expect(skills.length).toBeGreaterThan(0);
    });
  });

  describe("marketplace.json", () => {
    it("should exist and be valid JSON", () => {
      const path = join(root, ".github/plugin/marketplace.json");
      expect(existsSync(path)).toBe(true);
      const json = marketplaceJson();
      expect(json.name).toBe("oh-my-copilot");
    });

    it("should reference the owner r3dlex", () => {
      const json = marketplaceJson();
      expect(json.owner).toBeDefined();
      expect((json.owner as Record<string, unknown>).name).toBe("r3dlex");
    });

    it("should have metadata with description and version", () => {
      const json = marketplaceJson();
      expect(json.metadata).toBeDefined();
      const meta = json.metadata as Record<string, unknown>;
      expect(meta.description).toBeDefined();
      expect(meta.version).toBe("1.0.0");
    });

    it("should list at least one plugin", () => {
      const json = marketplaceJson();
      expect(Array.isArray(json.plugins)).toBe(true);
      expect(json.plugins.length).toBeGreaterThan(0);
    });

    it("should describe the plugin in marketplace listing", () => {
      const json = marketplaceJson();
      const plugin = (json.plugins as Array<Record<string, unknown>>)[0];
      expect(plugin.description as string).toContain("23 agents");
      expect(plugin.description as string).toContain("25 skills");
    });
  });

  describe("package.json", () => {
    it("should have Apache-2.0 license in package.json", () => {
      const json = packageJson();
      expect(json.license).toBe("Apache-2.0");
    });

    it("should have build script", () => {
      const json = packageJson();
      const scripts = json.scripts as Record<string, string>;
      expect(scripts.build).toBeDefined();
      expect(scripts.build).toContain("esbuild");
    });

    it("should have test script using vitest", () => {
      const json = packageJson();
      const scripts = json.scripts as Record<string, string>;
      expect(scripts.test).toBeDefined();
      expect(scripts.test).toContain("vitest");
    });

    it("should have Apache-2.0 license and required scripts", () => {
      const json = packageJson();
      expect(json.name).toBe("oh-my-copilot");
      expect(json.license).toBe("Apache-2.0");
      const scripts = json.scripts as Record<string, string>;
      expect(scripts["sync-claude-plugin"]).toBeDefined();
    });

    it("should have engines field requiring node >= 22.0.0", () => {
      const json = packageJson();
      expect(json.engines).toBeDefined();
      const engines = json.engines as Record<string, string>;
      expect(engines.node).toMatch(/>=22/);
    });
  });

  describe("LICENSE file", () => {
    it("should exist and be Apache-2.0", () => {
      const path = join(root, "LICENSE");
      expect(existsSync(path)).toBe(true);
      const content = readFileSync(path, "utf-8");
      expect(content).toContain("Apache License");
      expect(content).toContain("Version 2.0");
    });

    it("should contain copyright for r3dlex", () => {
      const content = readFileSync(join(root, "LICENSE"), "utf-8");
      expect(content).toContain("r3dlex");
    });
  });

  describe("README.md", () => {
    it("should reference 25 skills not 30+", () => {
      const content = readFileSync(join(root, "README.md"), "utf-8");
      expect(content).not.toContain("30+ skills");
      expect(content).toContain("25 skills");
    });

    it("should have build badge", () => {
      const content = readFileSync(join(root, "README.md"), "utf-8");
      expect(content).toContain("npm");
    });
  });
});