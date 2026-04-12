import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.{mts,ts}"],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      include: ["src/**/*.mts"],
      exclude: ["src/**/*.d.mts"],
      thresholds: {
        global: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        files: {
          "src/benchmark/**": {
            lines: 90,
            functions: 90,
            branches: 90,
            statements: 90,
          },
        },
      },
    },
    testTimeout: 10000,
    pool: "vmThreads",
    poolOptions: {
      vmThreads: { singleThread: true },
    },
    teardownTimeout: 1000,
  },
});
