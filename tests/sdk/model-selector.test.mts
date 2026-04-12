/**
 * Model Selector Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  recommendForAgent,
  recommendForTask,
  getAvailableModels,
} from "../../src/sdk/model-selector.mts";

describe("recommendForAgent", () => {
  it("should recommend high tier for orchestrator", () => {
    const rec = recommendForAgent("orchestrator");
    expect(rec.tier).toBe("high");
    expect(rec.model).toBe("claude-opus-4.6");
  });

  it("should recommend high tier for architect", () => {
    const rec = recommendForAgent("architect");
    expect(rec.tier).toBe("high");
  });

  it("should recommend high tier for planner", () => {
    const rec = recommendForAgent("planner");
    expect(rec.tier).toBe("high");
  });

  it("should recommend high tier for critic", () => {
    const rec = recommendForAgent("critic");
    expect(rec.tier).toBe("high");
  });

  it("should recommend standard tier for executor", () => {
    const rec = recommendForAgent("executor");
    expect(rec.tier).toBe("standard");
    expect(rec.model).toBe("claude-sonnet-4.5");
  });

  it("should recommend standard tier for debugger", () => {
    const rec = recommendForAgent("debugger");
    expect(rec.tier).toBe("standard");
  });

  it("should recommend standard tier for verifier", () => {
    const rec = recommendForAgent("verifier");
    expect(rec.tier).toBe("standard");
  });

  it("should recommend fast tier for explorer", () => {
    const rec = recommendForAgent("explorer");
    expect(rec.tier).toBe("fast");
    expect(rec.model).toBe("gpt-5.4-mini");
  });

  it("should recommend fast tier for writer", () => {
    const rec = recommendForAgent("writer");
    expect(rec.tier).toBe("fast");
  });

  it("should default to standard tier for unknown agent", () => {
    const rec = recommendForAgent("unknown-agent");
    expect(rec.tier).toBe("standard");
    expect(rec.model).toBe("claude-sonnet-4.5");
  });

  it("should include reason string", () => {
    const rec = recommendForAgent("executor");
    expect(rec.reason).toContain("executor");
    expect(rec.reason).toContain("standard");
  });
});

describe("recommendForTask", () => {
  it("should recommend high tier for architecture tasks", () => {
    const rec = recommendForTask("design the system architecture");
    expect(rec.tier).toBe("high");
    expect(rec.model).toBe("claude-opus-4.6");
  });

  it("should recommend high tier for architect keyword", () => {
    const rec = recommendForTask("architect a microservice");
    expect(rec.tier).toBe("high");
  });

  it("should recommend high tier for security tasks", () => {
    const rec = recommendForTask("security review");
    expect(rec.tier).toBe("high");
  });

  it("should recommend high tier for audit tasks", () => {
    const rec = recommendForTask("audit the codebase");
    expect(rec.tier).toBe("high");
  });

  it("should recommend fast tier for exploration tasks", () => {
    const rec = recommendForTask("explore the directory");
    expect(rec.tier).toBe("fast");
    expect(rec.model).toBe("gpt-5.4-mini");
  });

  it("should recommend fast tier for lookup tasks", () => {
    const rec = recommendForTask("lookup the function");
    expect(rec.tier).toBe("fast");
  });

  it("should recommend fast tier for write tasks", () => {
    const rec = recommendForTask("write a summary");
    expect(rec.tier).toBe("fast");
  });

  it("should recommend fast tier for documentation tasks", () => {
    const rec = recommendForTask("update the docs");
    expect(rec.tier).toBe("fast");
  });

  it("should default to standard tier for generic tasks", () => {
    const rec = recommendForTask("implement the feature");
    expect(rec.tier).toBe("standard");
    expect(rec.model).toBe("claude-sonnet-4.5");
  });

  it("should be case-insensitive", () => {
    const rec = recommendForTask("SECURITY AUDIT");
    expect(rec.tier).toBe("high");
  });
});

describe("getAvailableModels", () => {
  it("should return an array of model strings", () => {
    const models = getAvailableModels();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  it("should include the three tier models", () => {
    const models = getAvailableModels();
    expect(models).toContain("claude-opus-4.6");
    expect(models).toContain("claude-sonnet-4.5");
    expect(models).toContain("gpt-5.4-mini");
  });
});
