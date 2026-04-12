/**
 * HUD Formatters Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatBytes,
  formatDuration,
  formatDurationShort,
  formatTokensShort,
  formatPct,
  formatCount,
  truncate,
  pad,
  formatAge,
} from "../../src/hud/formatters.mts";

describe("formatBytes", () => {
  it("should format bytes under 1024 as B", () => {
    expect(formatBytes(0)).toBe("0B");
    expect(formatBytes(512)).toBe("512B");
    expect(formatBytes(1023)).toBe("1023B");
  });

  it("should format bytes in KB range", () => {
    expect(formatBytes(1024)).toBe("1.0KB");
    expect(formatBytes(2048)).toBe("2.0KB");
    expect(formatBytes(1_047_575)).toBe("1023.0KB");
  });

  it("should format bytes in MB range", () => {
    expect(formatBytes(1_048_576)).toBe("1.0MB");
    expect(formatBytes(2_097_152)).toBe("2.0MB");
  });
});

describe("formatDuration", () => {
  it("should format sub-second durations as ms", () => {
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(500)).toBe("500ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("should format durations under 60s as seconds", () => {
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(5500)).toBe("5.5s");
    expect(formatDuration(59_999)).toBe("60.0s");
  });

  it("should format durations over 60s as minutes and seconds", () => {
    expect(formatDuration(60_000)).toBe("1m 0s");
    expect(formatDuration(90_000)).toBe("1m 30s");
    expect(formatDuration(3_661_000)).toBe("61m 1s");
  });
});

describe("formatDurationShort", () => {
  it("should format sub-second durations as ms", () => {
    expect(formatDurationShort(0)).toBe("0ms");
    expect(formatDurationShort(999)).toBe("999ms");
  });

  it("should format durations under 60s without decimal", () => {
    expect(formatDurationShort(1000)).toBe("1s");
    expect(formatDurationShort(5500)).toBe("6s");
  });

  it("should format durations over 60s with compact notation", () => {
    expect(formatDurationShort(60_000)).toBe("1m0s");
    expect(formatDurationShort(90_000)).toBe("1m30s");
  });
});

describe("formatTokensShort", () => {
  it("should format tokens under 1000 as-is", () => {
    expect(formatTokensShort(0)).toBe("~0");
    expect(formatTokensShort(500)).toBe("~500");
    expect(formatTokensShort(999)).toBe("~999");
  });

  it("should format tokens in thousands as k", () => {
    expect(formatTokensShort(1000)).toBe("~1.0k");
    expect(formatTokensShort(50_000)).toBe("~50.0k");
    expect(formatTokensShort(999_999)).toBe("~1000.0k");
  });

  it("should format tokens in millions as M", () => {
    expect(formatTokensShort(1_000_000)).toBe("~1.0M");
    expect(formatTokensShort(2_500_000)).toBe("~2.5M");
  });
});

describe("formatPct", () => {
  it("should format percentage as plain string by default", () => {
    expect(formatPct(50)).toBe("50%");
    expect(formatPct(0)).toBe("0%");
    expect(formatPct(100)).toBe("100%");
  });

  it("should clamp values to 0-100", () => {
    expect(formatPct(-10)).toBe("0%");
    expect(formatPct(110)).toBe("100%");
  });

  it("should format compact mode", () => {
    expect(formatPct(75, { compact: true })).toBe("75%");
  });

  it("should format with color codes", () => {
    // < 60 is green
    const low = formatPct(30, { color: true });
    expect(low).toContain("\x1b[32m");
    expect(low).toContain("30%");

    // 60-84 is yellow
    const mid = formatPct(70, { color: true });
    expect(mid).toContain("\x1b[33m");
    expect(mid).toContain("70%");

    // >= 85 is red
    const high = formatPct(90, { color: true });
    expect(high).toContain("\x1b[31m");
    expect(high).toContain("90%");
  });

  it("should round fractional values", () => {
    expect(formatPct(50.7)).toBe("51%");
    expect(formatPct(50.4)).toBe("50%");
  });
});

describe("formatCount", () => {
  it("should use singular for value of 1", () => {
    expect(formatCount(1, "item")).toBe("1 item");
  });

  it("should use plural for value other than 1", () => {
    expect(formatCount(0, "item")).toBe("0 items");
    expect(formatCount(2, "item")).toBe("2 items");
    expect(formatCount(100, "item")).toBe("100 items");
  });

  it("should use custom plural when provided", () => {
    expect(formatCount(2, "person", "people")).toBe("2 people");
    expect(formatCount(1, "person", "people")).toBe("1 person");
  });
});

describe("truncate", () => {
  it("should return string unchanged if within maxLen", () => {
    expect(truncate("hello", 10)).toBe("hello");
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("should truncate and append ellipsis if over maxLen", () => {
    // slice(0, maxLen-1) chars + ellipsis character
    expect(truncate("hello world", 7)).toBe("hello …");
    expect(truncate("abcdefgh", 5)).toBe("abcd…");
  });
});

describe("pad", () => {
  it("should return string unchanged if at or over width", () => {
    expect(pad("hello", 5)).toBe("hello");
    expect(pad("hello world", 5)).toBe("hello world");
  });

  it("should pad with spaces by default", () => {
    expect(pad("hi", 5)).toBe("hi   ");
  });

  it("should pad with custom char", () => {
    expect(pad("hi", 5, "-")).toBe("hi---");
  });
});

describe("formatAge", () => {
  it("should format age under 60 minutes", () => {
    const now = Date.now();
    // 5 minutes ago
    const result = formatAge(now - 5 * 60_000);
    expect(result).toBe("5m");
  });

  it("should format age at exactly 0 minutes", () => {
    const result = formatAge(Date.now());
    expect(result).toBe("0m");
  });

  it("should format age in hours and minutes", () => {
    const now = Date.now();
    // 90 minutes ago
    const result = formatAge(now - 90 * 60_000);
    expect(result).toBe("1h 30m");
  });

  it("should format age at exact hour with no trailing minutes", () => {
    const now = Date.now();
    // Exactly 2 hours ago
    const result = formatAge(now - 2 * 60 * 60_000);
    expect(result).toBe("2h");
  });
});
