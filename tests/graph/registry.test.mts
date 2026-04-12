/**
 * Graph provider registry tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GraphBuildable } from "../../src/graph/types.mjs";

vi.mock("../../src/utils/config.mjs", () => ({
  loadConfig: vi.fn(),
  writeConfig: vi.fn(),
}));

// Mock adapter modules so registry doesn't try to load real adapters
vi.mock("../../src/graph/graphify-adapter.mjs", () => ({
  GraphifyAdapter: vi.fn().mockImplementation(() => mockGraphifyAdapter),
}));
vi.mock("../../src/graph/graphwiki-adapter.mjs", () => ({
  GraphwikiAdapter: vi.fn().mockImplementation(() => mockGraphwikiAdapter),
}));

import { loadConfig, writeConfig } from "../../src/utils/config.mjs";

const mockLoadConfig = vi.mocked(loadConfig);
const mockWriteConfig = vi.mocked(writeConfig);

const mockGraphifyAdapter: GraphBuildable = {
  id: "graphify",
  name: "Graphify",
  outputDir: "graphify-out",
  build: vi.fn(),
  exists: vi.fn(),
  getReportPath: vi.fn(),
  getGraphPath: vi.fn(),
  clean: vi.fn(),
  status: vi.fn(),
};

const mockGraphwikiAdapter: GraphBuildable = {
  id: "graphwiki",
  name: "GraphWiki",
  outputDir: "graphwiki-out",
  build: vi.fn(),
  exists: vi.fn(),
  getReportPath: vi.fn(),
  getGraphPath: vi.fn(),
  clean: vi.fn(),
  status: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getProvider", () => {
  it("returns graphwiki by default when no config exists", async () => {
    mockLoadConfig.mockReturnValue({});
    const { getProvider, _setAdaptersForTest } = await import("../../src/graph/registry.mjs");
    _setAdaptersForTest(new Map([
      ["graphify", mockGraphifyAdapter],
      ["graphwiki", mockGraphwikiAdapter],
    ]));
    const provider = getProvider();
    expect(provider.id).toBe("graphwiki");
  });

  it("returns graphify when config specifies graphify", async () => {
    mockLoadConfig.mockReturnValue({ graph: { provider: "graphify" } });
    const { getProvider, _setAdaptersForTest } = await import("../../src/graph/registry.mjs");
    _setAdaptersForTest(new Map([
      ["graphify", mockGraphifyAdapter],
      ["graphwiki", mockGraphwikiAdapter],
    ]));
    const provider = getProvider();
    expect(provider.id).toBe("graphify");
  });

  it("returns provider by explicit id, ignoring config", async () => {
    mockLoadConfig.mockReturnValue({ graph: { provider: "graphwiki" } });
    const { getProvider, _setAdaptersForTest } = await import("../../src/graph/registry.mjs");
    _setAdaptersForTest(new Map([
      ["graphify", mockGraphifyAdapter],
      ["graphwiki", mockGraphwikiAdapter],
    ]));
    const provider = getProvider("graphify");
    expect(provider.id).toBe("graphify");
  });

  it("throws for unknown provider id", async () => {
    const { getProvider, _setAdaptersForTest } = await import("../../src/graph/registry.mjs");
    _setAdaptersForTest(new Map([
      ["graphify", mockGraphifyAdapter],
      ["graphwiki", mockGraphwikiAdapter],
    ]));
    expect(() => getProvider("nonexistent")).toThrow(/Unknown graph provider/);
  });
});

describe("setProvider", () => {
  it("calls writeConfig with correct args for valid provider", async () => {
    const { setProvider, _setAdaptersForTest } = await import("../../src/graph/registry.mjs");
    _setAdaptersForTest(new Map([
      ["graphify", mockGraphifyAdapter],
      ["graphwiki", mockGraphwikiAdapter],
    ]));
    setProvider("graphify");
    expect(mockWriteConfig).toHaveBeenCalledWith("graph", "local", { graph: { provider: "graphify" } });
  });

  it("throws for unknown provider id", async () => {
    const { setProvider, _setAdaptersForTest } = await import("../../src/graph/registry.mjs");
    _setAdaptersForTest(new Map([
      ["graphify", mockGraphifyAdapter],
      ["graphwiki", mockGraphwikiAdapter],
    ]));
    expect(() => setProvider("unknown")).toThrow(/Unknown graph provider/);
    expect(mockWriteConfig).not.toHaveBeenCalled();
  });
});

describe("listProviders", () => {
  it("returns all registered provider ids", async () => {
    const { listProviders, _setAdaptersForTest } = await import("../../src/graph/registry.mjs");
    _setAdaptersForTest(new Map([
      ["graphify", mockGraphifyAdapter],
      ["graphwiki", mockGraphwikiAdapter],
    ]));
    const providers = listProviders();
    expect(providers).toContain("graphify");
    expect(providers).toContain("graphwiki");
    expect(providers).toHaveLength(2);
  });
});
