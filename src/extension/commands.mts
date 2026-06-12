/**
 * Pure builder mapping the OMP skill registry to Copilot SDK
 * CommandDefinition-shaped objects (SPEC-omp-2.0 §4, ADR-0002).
 *
 * The SDK types are declared structurally here on purpose:
 * `@github/copilot-sdk` is resolved by the Copilot CLI inside extension
 * processes only and is NOT a package.json dependency of this repo.
 * `extension/extension.mjs` mirrors this logic in a self-contained form.
 */

import type { SkillEntry } from "./registry.mts";

/** Minimal structural shape of the Copilot SDK CommandDefinition. */
export interface CommandDefinitionLike {
  name: string;
  description: string;
  handler: (args: string) => string;
}

/**
 * Returns the instruction string a command handler hands back to the
 * agent. Command handlers run in the extension process, so they cannot
 * execute the skill directly — they instruct the agent to activate it.
 */
export function buildActivationInstruction(
  skillId: string,
  args: string,
): string {
  const trimmed = args.trim();
  return `Activate the OMP skill "${skillId}" with args: ${trimmed.length > 0 ? trimmed : "(none)"}`;
}

/**
 * Expands the registry into one command per skill id plus one per alias.
 * Alias commands point at the canonical skill id in both their
 * description and activation instruction.
 */
export function buildCommands(registry: SkillEntry[]): CommandDefinitionLike[] {
  const commands: CommandDefinitionLike[] = [];
  for (const entry of registry) {
    commands.push({
      name: entry.id,
      description: entry.description,
      handler: (args: string) => buildActivationInstruction(entry.id, args),
    });
    for (const alias of entry.aliases ?? []) {
      commands.push({
        name: alias,
        description: `Alias for /${entry.id} — ${entry.description}`,
        handler: (args: string) => buildActivationInstruction(entry.id, args),
      });
    }
  }
  return commands;
}
