/**
 * setup skill
 *
 * Legacy alias for `omp-setup`.
 * Keep this wrapper while docs and manifests migrate to the `omp-*` namespace.
 */

import {
  activate as activateOmpSetup,
  deactivate as deactivateOmpSetup,
  type SkillInput,
  type SkillOutput,
} from "./omp-setup.mjs";

export type { SkillInput, SkillOutput } from "./omp-setup.mjs";

export async function activate(input: SkillInput): Promise<SkillOutput> {
  return activateOmpSetup(input);
}

export function deactivate(): void {
  deactivateOmpSetup();
}
