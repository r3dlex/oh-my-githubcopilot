/**
 * Graph provider interfaces for OMP.
 *
 * Two independent interfaces (no inheritance):
 *   - GraphBuildable: shared contract for any graph-building provider
 *   - GraphWikiClient: additional contract for wiki-capable providers (graphwiki)
 *
 * All methods are synchronous (spawnSync pattern), consistent with the
 * existing graphify skill. The id field uses `string` (not a union literal)
 * to allow future providers without interface changes.
 */

export interface BuildResult {
  success: boolean;
  outputPath: string;
  error?: string;
  /**
   * Provider-specific graph data. Graphify populates:
   *   { nodeCount: number, edgeCount: number, communityCount: number }
   */
  data?: Record<string, unknown>;
}

export interface StatusResult {
  exists: boolean;
  outputPath: string;
  reportPath: string;
}

export interface LintResult {
  issues: string[];
  clean: boolean;
}

export interface GraphBuildable {
  readonly id: string;
  readonly name: string;
  readonly outputDir: string;
  build(workspacePath: string, incremental?: boolean): BuildResult;
  exists(workspacePath: string): boolean;
  getReportPath(workspacePath: string): string;
  getGraphPath(workspacePath: string): string;
  clean(workspacePath: string): void;
  status(workspacePath: string): StatusResult;
}

/**
 * Extended contract for wiki-capable providers (graphwiki).
 * Independent of GraphBuildable — a provider may implement both.
 * Use duck-typing to check: `"query" in provider`
 */
export interface GraphWikiClient {
  query(workspacePath: string, question: string): string;
  path(workspacePath: string, from: string, to: string): string;
  lint(workspacePath: string): LintResult;
  refine(workspacePath: string, review?: boolean): string;
}
