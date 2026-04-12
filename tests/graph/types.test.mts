/**
 * Graph provider type contract tests.
 * Verifies structural shape of result types and that adapters can satisfy interfaces.
 */

import { describe, it, expect } from "vitest";
import type { BuildResult, StatusResult, LintResult, GraphBuildable, GraphWikiClient } from "../../src/graph/types.mjs";

describe("BuildResult", () => {
  it("accepts required fields only", () => {
    const r: BuildResult = { success: true, outputPath: "/out/graph.json" };
    expect(r.success).toBe(true);
    expect(r.outputPath).toBe("/out/graph.json");
    expect(r.error).toBeUndefined();
    expect(r.data).toBeUndefined();
  });

  it("accepts optional data field for provider-specific metadata", () => {
    const r: BuildResult = {
      success: true,
      outputPath: "/out/graph.json",
      data: { nodeCount: 42, edgeCount: 100, communityCount: 3 },
    };
    expect(r.data?.["nodeCount"]).toBe(42);
  });

  it("accepts error field on failure", () => {
    const r: BuildResult = { success: false, outputPath: "", error: "CLI not found" };
    expect(r.success).toBe(false);
    expect(r.error).toBe("CLI not found");
  });
});

describe("StatusResult", () => {
  it("has required exists, outputPath, reportPath fields", () => {
    const r: StatusResult = { exists: false, outputPath: "", reportPath: "" };
    expect(r.exists).toBe(false);
  });
});

describe("LintResult", () => {
  it("has issues array and clean flag", () => {
    const r: LintResult = { issues: ["line 1: unused import"], clean: false };
    expect(r.issues).toHaveLength(1);
    expect(r.clean).toBe(false);

    const clean: LintResult = { issues: [], clean: true };
    expect(clean.clean).toBe(true);
  });
});

describe("GraphBuildable interface", () => {
  it("can be satisfied by a conforming object", () => {
    const adapter: GraphBuildable = {
      id: "test",
      name: "Test Adapter",
      outputDir: "test-out",
      build: (_ws, _inc) => ({ success: true, outputPath: "/out" }),
      exists: (_ws) => false,
      getReportPath: (ws) => `${ws}/test-out/REPORT.md`,
      getGraphPath: (ws) => `${ws}/test-out/graph.json`,
      clean: (_ws) => {},
      status: (_ws) => ({ exists: false, outputPath: "", reportPath: "" }),
    };
    expect(adapter.id).toBe("test");
    expect(adapter.build("/ws")).toMatchObject({ success: true });
  });
});

describe("GraphWikiClient interface", () => {
  it("can be satisfied by a conforming object", () => {
    const client: GraphWikiClient = {
      query: (_ws, _q) => "answer",
      path: (_ws, _from, _to) => "A -> B",
      lint: (_ws) => ({ issues: [], clean: true }),
      refine: (_ws, _review) => "refined",
    };
    expect(client.query("/ws", "what?")).toBe("answer");
    expect(client.lint("/ws").clean).toBe(true);
  });

  it("is independent of GraphBuildable (duck-type guard pattern)", () => {
    const wikiclient: GraphWikiClient = {
      query: () => "",
      path: () => "",
      lint: () => ({ issues: [], clean: true }),
      refine: () => "",
    };
    // Duck-type check — do not use instanceof (interfaces don't exist at runtime)
    expect("query" in wikiclient).toBe(true);

    const buildable: GraphBuildable = {
      id: "plain",
      name: "Plain",
      outputDir: "out",
      build: () => ({ success: true, outputPath: "" }),
      exists: () => false,
      getReportPath: () => "",
      getGraphPath: () => "",
      clean: () => {},
      status: () => ({ exists: false, outputPath: "", reportPath: "" }),
    };
    // A plain GraphBuildable does NOT implement GraphWikiClient
    expect("query" in buildable).toBe(false);
  });
});
