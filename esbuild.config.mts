import { build } from "esbuild";

const hookEntries = [
  "src/hooks/keyword-detector.mts",
  "src/hooks/delegation-enforcer.mts",
  "src/hooks/stop-continuation.mts",
  "src/hooks/token-tracker.mts",
  "src/hooks/model-router.mts",
  "src/hooks/hud-emitter.mts",
];

// Hooks: individual bundles (each must be standalone)
for (const entry of hookEntries) {
  const name = entry.replace("src/hooks/", "").replace(".mts", "");
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    target: "node22",
    format: "esm",
    outdir: "dist/hooks",
    outExtension: { ".js": ".mjs" },
    external: ["better-sqlite3"],
    sourcemap: true,
    minify: false,
  });
  console.log(`Built hook: dist/hooks/${name}.mjs`);
}

// MCP server: single bundle
await build({
  entryPoints: ["src/mcp/server.mts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outdir: "dist/mcp",
  outExtension: { ".js": ".mjs" },
  external: ["better-sqlite3"],
  sourcemap: true,
  minify: false,
});
console.log("Built MCP server: dist/mcp/server.mjs");

// CLI tool
await build({
  entryPoints: ["src/index.mts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "bin/omp.mjs",
  external: ["better-sqlite3"],
  sourcemap: true,
  minify: false,
});
console.log("Built CLI tool: bin/omp.mjs");

// PSM, HUD, benchmark, sdk, utils — shared libs for type-checking only
// These are not standalone entry points; they're imported by hooks/MCP/CLI
console.log("Build complete.");
