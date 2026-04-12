/**
 * Copilot SDK Client Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  createSession,
  getSession,
  endSession,
} from "../../src/sdk/client.mts";

describe("createSession", () => {
  it("should return a session with an id", async () => {
    const session = await createSession();
    expect(session.id).toMatch(/^session-\d+$/);
  });

  it("should return default model when no config provided", async () => {
    const session = await createSession();
    expect(session.model).toBe("claude-sonnet-4.5");
  });

  it("should use provided model from config", async () => {
    const session = await createSession({ model: "claude-opus-4.6" });
    expect(session.model).toBe("claude-opus-4.6");
  });

  it("should include startedAt timestamp", async () => {
    const before = Date.now();
    const session = await createSession();
    const after = Date.now();
    expect(session.startedAt).toBeGreaterThanOrEqual(before);
    expect(session.startedAt).toBeLessThanOrEqual(after);
  });

  it("should accept apiKey in config without error", async () => {
    const session = await createSession({ apiKey: "test-key" });
    expect(session).toBeTruthy();
  });
});

describe("getSession", () => {
  it("should return a session object for a given id", async () => {
    const result = await getSession("my-session-id");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("my-session-id");
  });

  it("should return default model", async () => {
    const result = await getSession("any-id");
    expect(result!.model).toBe("claude-sonnet-4.5");
  });

  it("should include startedAt timestamp", async () => {
    const before = Date.now();
    const result = await getSession("any-id");
    const after = Date.now();
    expect(result!.startedAt).toBeGreaterThanOrEqual(before);
    expect(result!.startedAt).toBeLessThanOrEqual(after);
  });
});

describe("endSession", () => {
  it("should resolve without throwing", async () => {
    await expect(endSession("any-session-id")).resolves.toBeUndefined();
  });
});
