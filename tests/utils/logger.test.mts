/**
 * Logger Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as logger from "../../src/utils/logger.mts";

describe("logger", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it("should write a debug message to stderr when OMP_LOG_LEVEL=debug", () => {
    vi.stubEnv("OMP_LOG_LEVEL", "debug");
    logger.debug("test debug message");
    vi.stubEnv("OMP_LOG_LEVEL", "info");
    expect(stderrSpy).toHaveBeenCalledOnce();
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain("[DEBUG]");
    expect(output).toContain("test debug message");
  });

  it("should write an info message to stderr", () => {
    logger.info("test info message");
    expect(stderrSpy).toHaveBeenCalledOnce();
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain("[INFO]");
    expect(output).toContain("test info message");
  });

  it("should write a warning message to stderr", () => {
    logger.warn("test warn message");
    expect(stderrSpy).toHaveBeenCalledOnce();
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain("[WARN]");
    expect(output).toContain("test warn message");
  });

  it("should write an error message to stderr", () => {
    logger.error("test error message");
    expect(stderrSpy).toHaveBeenCalledOnce();
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain("[ERROR]");
    expect(output).toContain("test error message");
  });

  it("should include ISO timestamp in log output", () => {
    logger.info("timestamp test");
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("should include meta object as JSON when provided", () => {
    logger.info("with meta", { foo: "bar", num: 42 });
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('"foo":"bar"');
    expect(output).toContain('"num":42');
  });

  it("should return a child logger that includes context in every message", () => {
    const child = logger.child({ component: "test", requestId: "abc" });
    child.info("child message");
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('"component":"test"');
    expect(output).toContain('"requestId":"abc"');
    expect(output).toContain("child message");
  });

  it("child logger should merge extra meta on top of context", () => {
    const child = logger.child({ component: "outer" });
    child.info("merged", { extra: "field" });
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('"component":"outer"');
    expect(output).toContain('"extra":"field"');
  });

  it("should append user meta after context in child logger", () => {
    const child = logger.child({ ctx: "context" });
    child.info("msg", { user: "data" });
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('"ctx":"context"');
    expect(output).toContain('"user":"data"');
  });
});
