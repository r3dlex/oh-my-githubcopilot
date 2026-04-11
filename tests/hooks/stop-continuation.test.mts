/**
 * stop-continuation hook tests
 */

import { describe, it, expect } from "vitest";
import { processHook } from "../../src/hooks/stop-continuation.mts";

describe("stop-continuation hook", () => {
  describe("processHook", () => {
    it("should skip non-SessionEnd hooks", () => {
      const result = processHook({ hook_type: "PreToolUse" });
      expect(result.status).toBe("skip");
    });

    it("should return ok with empty mutations for SessionEnd without active modes", () => {
      const result = processHook({
        hook_type: "SessionEnd",
        session_id: "nonexistent-session",
      });
      expect(result.status).toBe("ok");
    });

    it("should return ok for SessionEnd with no session_id", () => {
      const result = processHook({
        hook_type: "SessionEnd",
      });
      expect(result.status).toBe("ok");
    });

    it("should include latency in result", () => {
      const result = processHook({
        hook_type: "SessionEnd",
        session_id: "test-session",
      });
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should return ok status for SessionEnd hook", () => {
      const result = processHook({
        hook_type: "SessionEnd",
      });
      expect(result.status).toBe("ok");
    });

    it("should handle message field in SessionEnd", () => {
      const result = processHook({
        hook_type: "SessionEnd",
        message: "session ended normally",
      });
      expect(result.status).toBe("ok");
    });
  });
});