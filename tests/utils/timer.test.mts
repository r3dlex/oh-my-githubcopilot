/**
 * Timer Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  startTimer,
  stopTimer,
  elapsed,
  timed,
  timedSync,
  formatDuration,
} from "../../src/utils/timer.mts";

describe("startTimer / stopTimer / elapsed", () => {
  it("should return a timer with a start timestamp", () => {
    const timer = startTimer();
    expect(timer).toHaveProperty("start");
    expect(typeof timer.start).toBe("number");
    expect(timer.end).toBeUndefined();
  });

  it("should report zero elapsed immediately after start", () => {
    const timer = startTimer();
    const ms = elapsed(timer);
    expect(ms).toBeGreaterThanOrEqual(0);
    expect(ms).toBeLessThan(50);
  });

  it("should accumulate elapsed time when stopped", async () => {
    const timer = startTimer();
    await new Promise((r) => setTimeout(r, 100));
    const ms = stopTimer(timer);
    expect(ms).toBeGreaterThanOrEqual(90);
    expect(ms).toBeLessThan(300);
  });

  it("should return the same elapsed value after stopping", async () => {
    const timer = startTimer();
    await new Promise((r) => setTimeout(r, 50));
    const first = stopTimer(timer);
    const second = elapsed(timer);
    expect(first).toBe(second);
  });
});

describe("timed", () => {
  it("should return the resolved value and elapsedMs", async () => {
    const result = await timed(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return "done";
    });
    expect(result.value).toBe("done");
    expect(result.elapsedMs).toBeGreaterThanOrEqual(20);
    expect(result.elapsedMs).toBeLessThan(200);
  });
});

describe("timedSync", () => {
  it("should return the resolved value and elapsedMs synchronously", () => {
    const result = timedSync(() => {
      return 42;
    });
    expect(result.value).toBe(42);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(result.elapsedMs).toBeLessThan(50);
  });
});

describe("formatDuration", () => {
  it("should format sub-second durations in ms", () => {
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(150)).toBe("150ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("should format seconds with one decimal place", () => {
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(1500)).toBe("1.5s");
    expect(formatDuration(59_999)).toBe("60.0s");
  });

  it("should format minutes and seconds", () => {
    expect(formatDuration(60_000)).toBe("1m 0s");
    expect(formatDuration(90_000)).toBe("1m 30s");
    expect(formatDuration(61_500)).toBe("1m 2s");
    expect(formatDuration(120_000)).toBe("2m 0s");
  });
});
