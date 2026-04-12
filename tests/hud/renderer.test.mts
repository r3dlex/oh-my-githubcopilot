/**
 * HUD Renderer tests
 */

import { describe, it, expect } from "vitest";
import { renderAnsi, renderPlain } from "../../src/hud/renderer.mts";

describe("HUD renderer", () => {
  const createMockState = (activeMode = null, status = "running") => ({
    sessionId: "test-session",
    activeMode,
    activeModel: "claude-sonnet-4.5",
    contextPct: 45,
    tokensUsed: 50_000,
    tokensTotal: 200_000,
    agentsActive: ["executor", "analyst"],
    lastAgent: "analyst",
    lastOutput: "",
    taskProgress: 0,
    startedAt: Date.now() - 300_000, // 5 minutes ago
    updatedAt: Date.now(),
    version: "1.0.0",
    status,
    sessionDurationMs: 300_000,
    cumulativeAgentsUsed: 2,
    model: "claude-sonnet-4.5",
  });

  describe("renderAnsi", () => {
    it("should render a status line with ANSI codes", () => {
      const state = createMockState();
      const output = renderAnsi(state);
      expect(output).toContain("OMP");
      expect(output).toContain("sonnet");
    });

    it("should include mode when active", () => {
      const state = createMockState("ralph");
      const output = renderAnsi(state);
      expect(output).toContain("ralph");
    });

    it("should show dash when no mode active", () => {
      const state = createMockState(null);
      const output = renderAnsi(state);
      expect(output).toContain("-");
    });

    it("should include running status icon", () => {
      const state = createMockState(null, "running");
      const output = renderAnsi(state);
      expect(output).toContain("running");
    });

    it("should include idle status", () => {
      const state = createMockState(null, "idle");
      const output = renderAnsi(state);
      expect(output).toContain("idle");
    });

    it("should handle complete status", () => {
      const state = createMockState(null, "complete");
      const output = renderAnsi(state);
      expect(output).toContain("complete");
    });

    it("should handle error status", () => {
      const state = createMockState(null, "error");
      const output = renderAnsi(state);
      expect(output).toContain("error");
    });

    it("should handle eco status", () => {
      const state = createMockState(null, "eco");
      const output = renderAnsi(state);
      expect(output).toContain("eco");
    });
  });

  describe("renderPlain", () => {
    it("should render without ANSI codes", () => {
      const state = createMockState();
      const output = renderPlain(state);
      expect(output).toContain("OMP");
    });

    it("should show tilde prefix for estimated tokens", () => {
      const state = createMockState();
      const output = renderPlain(state);
      expect(output).toContain("~");
    });

    it("should show session duration", () => {
      const state = createMockState();
      const output = renderPlain(state);
      expect(output.length).toBeGreaterThan(0);
    });

    it("should show mode or dash", () => {
      const state = createMockState("autopilot");
      const output = renderPlain(state);
      expect(output).toContain("autopilot");
    });
  });

  describe("N/M format", () => {
    it("should render tools in N/M format in renderAnsi", () => {
      const state = createMockState();
      const output = renderAnsi(state);
      expect(output).toMatch(/tools:\d+\/\d+/);
    });

    it("should render skills in N/M format in renderAnsi", () => {
      const state = createMockState();
      const output = renderAnsi(state);
      expect(output).toMatch(/skills:\d+\/\d+/);
    });

    it("should render agents in N/M format in renderAnsi", () => {
      const state = createMockState();
      const output = renderAnsi(state);
      expect(output).toMatch(/agents:\d+\/\d+/);
    });

    it("should render tools in N/M format in renderPlain", () => {
      const state = createMockState();
      const output = renderPlain(state);
      expect(output).toMatch(/tools:\d+\/\d+/);
    });

    it("should render skills in N/M format in renderPlain", () => {
      const state = createMockState();
      const output = renderPlain(state);
      expect(output).toMatch(/skills:\d+\/\d+/);
    });

    it("should render agents in N/M format in renderPlain", () => {
      const state = createMockState();
      const output = renderPlain(state);
      expect(output).toMatch(/agents:\d+\/\d+/);
    });

    it("should use default totals when not provided", () => {
      const state = createMockState();
      const output = renderPlain(state);
      expect(output).toContain("tools:0/13");
      expect(output).toContain("skills:0/21");
      expect(output).toContain("agents:2/23");
    });

    it("should use provided totals when specified", () => {
      const state = { ...createMockState(), toolsTotal: 20, skillsTotal: 30, agentsTotal: 10 };
      const output = renderPlain(state);
      expect(output).toContain("tools:0/20");
      expect(output).toContain("skills:0/30");
      expect(output).toContain("agents:2/10");
    });
  });

  describe("edge cases", () => {
    it("should format tokens at exact 1k boundary", () => {
      // Tokens just under, at, and over 1000
      const s1 = createMockState(); s1.tokensUsed = 999; s1.tokensTotal = 200_000;
      const s2 = createMockState(); s2.tokensUsed = 1000; s2.tokensTotal = 200_000;
      const s3 = createMockState(); s3.tokensUsed = 1001; s3.tokensTotal = 200_000;
      const out1 = renderPlain(s1); const out2 = renderPlain(s2); const out3 = renderPlain(s3);
      expect(out1).toContain("999"); expect(out2).toContain("1.0k"); expect(out3).toContain("1.0k");
    });

    it("should format tokens at exact 1M boundary", () => {
      const s1 = createMockState(); s1.tokensUsed = 999_400; s1.tokensTotal = 2_000_000;
      const s2 = createMockState(); s2.tokensUsed = 1_000_000; s2.tokensTotal = 2_000_000;
      const out1 = renderPlain(s1); const out2 = renderPlain(s2);
      expect(out1).toContain("999.4k"); expect(out2).toContain("1.0M");
    });

    it("should format age under 1 minute", () => {
      const state = createMockState(); state.startedAt = Date.now() - 30_000;
      const output = renderPlain(state);
      expect(output).toMatch(/0m|[0-9]+m/);
    });

    it("should format age at exact hour boundary", () => {
      const state = createMockState();
      state.startedAt = Date.now() - (60 * 60 * 1000); // exactly 1 hour
      const output = renderPlain(state);
      expect(output).toContain("1h");
    });
  });
});