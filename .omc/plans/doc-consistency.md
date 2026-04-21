# Plan: OMP Documentation Consistency

**Date:** 2026-04-12
**Scope:** 23 agent files, 25 skill files, 4 root/spec docs + additional stale-count files
**Estimated complexity:** MEDIUM
**Parallelizable:** Yes -- phases 1-3 can run as independent writer agents

---

## Context

OMP documentation has grown organically from 18 to 23 agents and from 21 to 25 skills, but the docs are inconsistent:
- Agent `.md` files use two different structural patterns (full XML template vs. abbreviated template)
- Skill `SKILL.md` files use two different formats (table-based metadata vs. YAML frontmatter)
- Root docs (README.md, CLAUDE.md) cite stale counts (18 agents, 21 skills, 30+ skills)
- `spec/AGENTS_SPEC.md` and `spec/SKILLS.md` reference 18 agents and 30+ skills
- Additional files (`README.fr.md`, `spec/PLUGIN.md`, `.archgate/adrs/ARCH-001-adopt-archgate.md`) contain stale counts
- Historical files (`spec/IMPLEMENTATION.md`, `CHANGELOG.md`) contain old counts that should be preserved as historical record

## Work Objectives

Normalize all documentation to consistent formats and accurate counts.

## Guardrails

**Must Have:**
- Every agent file follows the full XML Agent_Prompt template with all REQUIRED sections (and RECOMMENDED sections for opus-model agents)
- Every skill file uses the same structural format (either all table-based or all YAML frontmatter -- see open questions)
- All counts across root docs match reality (23 agents, 25 skills)
- No behavioral changes to agent prompts -- only structural reformatting

**Must NOT Have:**
- Rewriting agent prompt content (Role text, process steps, etc.) -- only add missing structural sections
- Changing model assignments or tool lists
- Adding new agents or skills
- Modifying any TypeScript source code

---

## Phase 1: Normalize Agent Files to Full Template (17 files)

### Target format (the "write-agent-docs" standard)

Agent `.md` files use a two-tier section requirement inside `<Agent_Prompt>`:

**REQUIRED for all agents (7 sections):**

1. `<Role>` -- mission + responsibility boundaries
2. `<Why_This_Matters>` -- why constraints exist
3. `<Success_Criteria>` -- measurable bullet list
4. `<Constraints>` -- what agent must NOT do
5. Domain-specific process section (e.g., `<Investigation_Protocol>`, `<Debugging_Process>`, `<Design_Protocol>`) -- numbered steps
6. `<Tool_Usage>` -- which tools and when
7. `<Output_Format>` -- output structure

**RECOMMENDED sections (required for opus-model agents, optional for sonnet/haiku-model agents):**

The RECOMMENDED sections are required for agents whose frontmatter has `model:` containing "opus". These are referred to as "opus-model agents" throughout this plan.

**Opus-model agents (must have all 11 sections):**
- `architect.md` (claude-opus-4-6)
- `critic.md` (claude-opus-4-6)
- `analyst.md` (claude-opus-4-6)
- `planner.md` (claude-opus-4)
- `code-reviewer.md` (claude-opus-4-6)
- `designer.md` (claude-opus-4)
- `orchestrator.md` (claude-opus-4)
- `reviewer.md` (claude-opus-4)
- `simplifier.md` (claude-opus-4-6)

**Sonnet-model agents (must have 7 REQUIRED sections; RECOMMENDED sections optional but encouraged):**
- `executor.md`, `explorer.md`, `researcher.md`, `tester.md`, `verifier.md`, `writer.md`, `git-master.md`, `document-specialist.md`, `tracer.md`, `debugger.md`, `qa-tester.md`, `scientist.md`, `security-reviewer.md`, `test-engineer.md`

8. `<Execution_Policy>` -- effort level, stop conditions
9. `<Failure_Modes_To_Avoid>` -- anti-patterns with corrections
10. `<Examples>` with `<Good>` and `<Bad>` children
11. `<Final_Checklist>` -- checklist items

This means Category B sonnet-model agents only need the 7 core REQUIRED sections added, while Category B opus-model agents (designer, orchestrator, reviewer, simplifier, planner) must reach all 11 sections. Category C agents that are opus-model (architect, code-reviewer) must have all 11 sections; sonnet-model Category C agents need at minimum the 7 REQUIRED sections.

### Category A: Already compliant (6 files -- NO CHANGES needed)

These agents have all 11 sections present:

| File | Status |
|------|--------|
| `analyst.md` | Complete |
| `critic.md` | Complete |
| `document-specialist.md` | Complete |
| `executor.md` | Complete (has extra `<External_Consultation>` -- keep it) |
| `git-master.md` | Complete |
| `tracer.md` | Complete (has extra `<Evidence_Strength_Hierarchy>`, `<Disconfirmation_Rules>` -- keep them) |

### Category B: Partially compliant -- missing sections (10 files)

| File | Has | Missing |
|------|-----|---------|
| `designer.md` | Role, Why_This_Matters, Success_Criteria, Constraints, Tool_Usage, Output_Format, Failure_Modes_To_Avoid, Final_Checklist | Investigation_Protocol (or Design_Protocol equivalent is present), Execution_Policy, Examples |
| `planner.md` | Role, Why_This_Matters, Success_Criteria, Constraints, Output_Format, Failure_Modes_To_Avoid, Final_Checklist | Tool_Usage, Execution_Policy, Examples |
| `simplifier.md` | Role, Why_This_Matters, Success_Criteria, Constraints, Output_Format, Failure_Modes_To_Avoid, Final_Checklist | Tool_Usage, Execution_Policy, Examples (has `<Core_Principles>` and `<Process>` instead of Investigation_Protocol -- keep domain names) |
| `explorer.md` | All 7 REQUIRED sections + most RECOMMENDED | Examples, Execution_Policy |
| `orchestrator.md` | All 7 REQUIRED sections + most RECOMMENDED | Examples, Execution_Policy |
| `researcher.md` | All 7 REQUIRED sections + most RECOMMENDED | Examples, Execution_Policy |
| `reviewer.md` | All 7 REQUIRED sections + most RECOMMENDED | Examples, Execution_Policy |
| `tester.md` | All 7 REQUIRED sections + most RECOMMENDED | Examples, Execution_Policy |
| `verifier.md` | All 7 REQUIRED sections + most RECOMMENDED | Examples, Execution_Policy |
| `writer.md` | All 7 REQUIRED sections + most RECOMMENDED | Examples, Execution_Policy |

**Work:** For designer, planner, simplifier: add the 2-3 missing sections. Note: `planner.md`, `designer.md`, `simplifier.md` are opus-model agents and therefore MUST have all 11 sections including RECOMMENDED ones. For `orchestrator.md` and `reviewer.md`: also opus-model agents -- they currently have most RECOMMENDED sections but are missing Examples and Execution_Policy; add those to reach all 11 sections. For the remaining agents moved from the previous Category A (explorer, researcher, tester, verifier, writer): add `<Examples>` and `<Execution_Policy>` sections. These are sonnet-model agents, so the RECOMMENDED sections are optional but beneficial -- add them for consistency. Keep existing domain-specific section names (e.g., `<Design_Protocol>` is fine instead of `<Investigation_Protocol>`). Content for missing sections should be inferred from each agent's existing Role and Constraints.

### Category C: Abbreviated format -- needs significant additions (7 files)

These use a minimal template with only Role, When_Active, domain-Process, Output_Format, and Constraints. They lack 6+ sections:

| File | Missing sections |
|------|-----------------|
| `architect.md` | Why_This_Matters, Success_Criteria, Tool_Usage, Execution_Policy, Failure_Modes_To_Avoid, Examples, Final_Checklist |
| `code-reviewer.md` | Why_This_Matters, Success_Criteria, Tool_Usage, Execution_Policy, Failure_Modes_To_Avoid, Examples, Final_Checklist |
| `debugger.md` | Why_This_Matters, Success_Criteria, Tool_Usage, Execution_Policy, Failure_Modes_To_Avoid, Examples, Final_Checklist |
| `qa-tester.md` | Why_This_Matters, Success_Criteria, Tool_Usage, Execution_Policy, Failure_Modes_To_Avoid, Examples, Final_Checklist |
| `scientist.md` | Why_This_Matters, Success_Criteria, Tool_Usage, Execution_Policy, Failure_Modes_To_Avoid, Examples, Final_Checklist |
| `security-reviewer.md` | Why_This_Matters, Success_Criteria, Tool_Usage, Execution_Policy, Failure_Modes_To_Avoid, Examples, Final_Checklist |
| `test-engineer.md` | Why_This_Matters, Success_Criteria, Tool_Usage, Execution_Policy, Failure_Modes_To_Avoid, Examples, Final_Checklist |

**Work:** For each file, add the missing sections based on agent tier. Opus-model agents (`architect.md`, `code-reviewer.md`) need all 11 sections including RECOMMENDED ones -- `code-reviewer.md` is already getting 7 new sections added here, which brings it to all 11. Sonnet-model agents need at minimum the 7 REQUIRED sections; add RECOMMENDED sections where beneficial. Rename `<When_Active>` to be incorporated into `<Role>` (or keep it as an extra section). Keep existing domain-specific process section names (e.g., `<Verification_Process>`, `<Debugging_Process>`). The `architect.md` also has `<Mission>`, `<RALPLAN_Mode>`, `<Verdict_Format>`, `<Architecture_Analysis_Format>` -- keep all of these as domain-specific extras.

**Diff-review note:** After each Category C agent is updated, the Critic should review the new sections for behavioral drift before proceeding to the next file.

**Clarification on "infer content from Role and Constraints":** For Category C agents, this means write structurally complete sections that surface information ALREADY PRESENT in the agent's existing sections -- not invent new behavioral rules. Example: a `<Why_This_Matters>` section for `security-reviewer` should restate in 2-3 sentences why the constraints in `<Constraints>` exist, not introduce new constraints. The goal is to make implicit rationale explicit, not to expand the agent's behavioral scope.

### Acceptance Criteria -- Phase 1
- [ ] Every file in `src/agents/*.md` has all 7 REQUIRED sections (or domain-equivalent names)
- [ ] Opus-model agents (architect, critic, analyst, planner, code-reviewer, designer, orchestrator, reviewer, simplifier) additionally have all 4 RECOMMENDED sections
- [ ] No agent's Role text, process steps, or output format content was rewritten
- [ ] All existing domain-specific extra sections are preserved
- [ ] Model and tool frontmatter unchanged
- [ ] Critic reviewed each Category C agent update for behavioral drift before proceeding
- [ ] Files: **~17 modified** (Categories B + C)

---

## Phase 2: Normalize Skill Files to Consistent Format (25 files)

### Current state: Two formats coexist

**Format A -- Table-based metadata** (21 files): autopilot, configure-notifications, deep-interview, ecomode, hud, learner, mcp-setup, note, omp-plan, omp-setup, pipeline, psm, ralph, release, setup, swarm, swe-bench, team, trace, ultrawork, wiki

Structure:
```markdown
# Skill: Name

## Metadata
| Field | Value |
| ID | ... |
| Keywords | ... |

## Description
## Interface
## Implementation
```

**Format B -- YAML frontmatter** (4 files): graph-provider, graphify, graphwiki, spending

Structure:
```markdown
---
name: skill-name
description: ...
---
# Skill Name
## Actions
### action1
### action2
## Configuration
```

### Target format

Unify to Format A (table-based metadata) since it is the majority (21/25). Add missing sections where absent.

Every SKILL.md should have:
1. `# Skill: Name` -- title
2. `## Metadata` -- table with ID, Keywords, Tier, Source
3. `## Description` -- what this skill does
4. `## Interface` -- TypeScript interface or invocation signature
5. `## Implementation` -- how it works internally
6. `## Actions` (if the skill has sub-commands) -- list of supported actions
7. `## Examples` (if useful) -- concrete invocation examples

### Work by file

**Already compliant (21 files):** autopilot, configure-notifications, deep-interview, ecomode, hud, learner, mcp-setup, note, omp-plan, omp-setup, pipeline, psm, ralph, release, setup, swarm, swe-bench, team, trace, ultrawork, wiki -- verify they all have Description, Interface, and Implementation sections (they do from the scan).

**Need conversion from Format B to Format A (4 files):**
- `graph-provider/SKILL.md` -- convert YAML frontmatter to Metadata table, add Interface + Implementation sections
- `graphify/SKILL.md` -- same conversion
- `graphwiki/SKILL.md` -- same conversion
- `spending/SKILL.md` -- same conversion

Note: Some Format B files have richer content (Actions, Configuration sections). Preserve that content and add it after the standard sections.

### Acceptance Criteria -- Phase 2
- [ ] All 25 `skills/*/SKILL.md` files use the table-based Metadata format
- [ ] No YAML frontmatter remains in any skill file
- [ ] All files have at minimum: title, Metadata table, Description, Interface, Implementation
- [ ] Existing Actions/Configuration/Examples sections preserved
- [ ] Files: **~4 modified**

---

## Phase 3: Update Root and Spec Docs (7-9 files)

### 3a. README.md

| Section | Current | Target |
|---------|---------|--------|
| Tagline (line 8) | "18 specialized agents, 21 skills" | "23 specialized agents, 25 skills" |
| Table row: agents | "23 agents" (partially updated) | "23 agents" (verify) |
| Table row: skills | "21 skills" | "25 skills" |
| Agent table (lines 78-86) | Lists 6 agents, says "18 total" in ASCII diagram | List all 23 or say "23 total" |
| Architecture diagram (line 66) | "... (18 total)" | "... (23 total)" |
| Agents section header (line 76) | "OMP provides 18 specialized agents" | "OMP provides 23 specialized agents" |

### 3b. README.fr.md

| Section | Current | Target |
|---------|---------|--------|
| Agent count references | "18 specialized agents" | "23 specialized agents" |
| Skill count references | "21 skills" | "25 skills" |

Mirror all count updates from README.md into the French translation.

### 3c. CLAUDE.md

| Line | Current | Target |
|------|---------|--------|
| Line 3 | "18 specialized agents, 30+ skills" | "23 specialized agents, 25 skills" |
| Line 30 | "18-agent table & model tiers" | "23-agent table & model tiers" |
| Line 31 | "30+ skills & lazy loading" | "25 skills & lazy loading" |

### 3d. AGENTS.md

Already says "23 Agents" in the registry header (line 17). Verify all 23 are listed in the table (they are -- confirmed from read). No changes needed unless the table is out of date.

### 3e. spec/AGENTS_SPEC.md

| Line | Current | Target |
|------|---------|--------|
| Line 5 | "OMP exposes 18 agents" | "OMP exposes 23 agents" |
| Agent table | Likely lists only 18 | Must list all 23 agents |

### 3f. spec/SKILLS.md

| Line | Current | Target |
|------|---------|--------|
| Line 5 | "30+ skills" | "25 skills" |
| Skill registry table | May be incomplete | Must list all 25 skills |

### 3g. spec/PLUGIN.md

| Section | Current | Target |
|---------|---------|--------|
| Agent count references | "18 agents" | "23 agents" |

Update all forward-facing count references.

### 3h. .archgate/adrs/ARCH-001-adopt-archgate.md

Review this file. If it contains forward-facing references to agent/skill counts (e.g., "OMP has 18 agents"), update to 23. If the counts appear only as historical context describing the state at the time of the ADR decision, leave as-is with no changes.

### 3i. Historical files -- leave as-is

The following files contain old counts in historical context. Do NOT modify them:

- **`spec/IMPLEMENTATION.md`** -- Historical implementation plan. Contains counts reflecting the state at time of writing. Leave as-is. Add a note at the top if desired: `> Note: Agent/skill counts in this document reflect the state at time of writing and may not match current totals.`
- **`CHANGELOG.md`** -- Historical release entries. Leave as-is (historical accuracy). Counts in past release notes describe what was true at that release.

### Acceptance Criteria -- Phase 3
- [ ] All instances of "18 agents" replaced with "23 agents" across README.md, README.fr.md, CLAUDE.md, spec/AGENTS_SPEC.md, spec/PLUGIN.md
- [ ] All instances of "21 skills" or "30+ skills" replaced with "25 skills" in those same files
- [ ] Agent tables in spec/AGENTS_SPEC.md list all 23 agents
- [ ] Skill tables in spec/SKILLS.md list all 25 skills
- [ ] .archgate/adrs/ARCH-001-adopt-archgate.md reviewed and updated only if forward-facing
- [ ] spec/IMPLEMENTATION.md and CHANGELOG.md left untouched (historical accuracy)
- [ ] No other content changes
- [ ] Files: **6-8 modified**

---

## Phase 4: Verification

Run a verification pass to confirm:

1. **Agent section completeness:** For each `src/agents/*.md`, confirm all 7 REQUIRED XML sections exist (grep for each tag). For opus-model agents (architect, critic, analyst, planner, code-reviewer, designer, orchestrator, reviewer, simplifier), confirm all 11 sections (REQUIRED + RECOMMENDED).
2. **Skill format consistency:** For each `skills/*/SKILL.md`, confirm no YAML frontmatter exists and Metadata table is present
3. **Count accuracy:** Run recursive grep across the entire repo for stale counts:
   ```
   grep -r "18 agents\|21 skills\|30+ skills" --include="*.md"
   ```
   Filter results: any hits in `CHANGELOG.md` or `spec/IMPLEMENTATION.md` are expected (historical) and should be ignored. All other hits are failures.
4. **No regressions:** Confirm no TypeScript files were modified

### Acceptance Criteria -- Phase 4
- [ ] Zero occurrences of stale counts in any non-historical `.md` file (excluding `CHANGELOG.md` and `spec/IMPLEMENTATION.md`)
- [ ] 23/23 agent files pass section completeness check (REQUIRED sections for all; RECOMMENDED sections for 9 opus-model agents)
- [ ] 25/25 skill files pass format consistency check
- [ ] Zero `.ts`/`.mts`/`.js` files modified

---

## Task Flow

```
Phase 1 (agents)  ──┐
Phase 2 (skills)  ──┼── can run in parallel ──→ Phase 4 (verification)
Phase 3 (root docs) ┘
```

## Execution Summary

| Phase | Files Modified | Parallelizable |
|-------|---------------|----------------|
| Phase 1: Agent normalization | ~17 | Yes (each file independent; Critic review after each Category C file) |
| Phase 2: Skill normalization | ~4 | Yes (each file independent) |
| Phase 3: Root/spec doc updates | ~7 | Yes (each file independent) |
| Phase 4: Verification | 0 (read-only) | After phases 1-3 |
| **Total** | **~28 files** | |

## Success Criteria

1. Any agent file opened at random contains all 7 REQUIRED XML sections (and all 11 for opus-model agents: architect, critic, analyst, planner, code-reviewer, designer, orchestrator, reviewer, simplifier)
2. Any skill file opened at random uses the table-based Metadata format
3. `grep -r "18 agents\|21 skills\|30+ skills" --include="*.md"` returns zero results outside of `CHANGELOG.md` and `spec/IMPLEMENTATION.md`
4. No TypeScript source files were modified

---

## Revision Log

**2026-04-12 -- Critic revision (3 MAJOR fixes applied):**

1. **Fix 1 -- Phase 3 stale-count files expanded:** Added subsections for `README.fr.md` (update counts to 23/25), `spec/PLUGIN.md` (update "18 agents" to 23), `.archgate/adrs/ARCH-001-adopt-archgate.md` (update if forward-facing, leave if historical), `spec/IMPLEMENTATION.md` (leave as-is with historical note), and `CHANGELOG.md` (leave as-is, historical accuracy). Phase 4 verification grep changed from shallow `*.md spec/*.md` to recursive `grep -r --include="*.md"` with explicit exclusion of historical files.

2. **Fix 2 -- Skill file counts corrected:** Format A changed from "18 files" to "21 files". Format B changed from "7 files" to "4 files" with explicit list: graph-provider, graphify, graphwiki, spending. Removed ambiguous "partial others" note. Phase 2 work section updated from "~7 modified" to "~4 modified".

3. **Fix 3 -- Tier gate defined unambiguously:** Chose option (b): RECOMMENDED sections required for agents whose frontmatter has `model:` containing "opus". All "Level-1/opus agents" references renamed to "opus-model agents". Added explicit list of opus-model agents (architect, critic, analyst, planner, code-reviewer, designer, orchestrator, reviewer, simplifier) vs. sonnet-model agents (all others).

**Additional improvements:**
- Added diff-review note in Phase 1: Critic should review each Category C agent update for behavioral drift before proceeding.
- Added clarification: "infer content from Role and Constraints" means write structurally complete sections that surface information ALREADY PRESENT in existing sections -- not invent new behavioral rules. Includes concrete example for security-reviewer.

**2026-04-12 -- Opus-model agent list correction (5 fixes applied):**

1. **Fix 1 -- Opus-model agents expanded from 4 to 9:** Added code-reviewer (claude-opus-4-6), designer (claude-opus-4), orchestrator (claude-opus-4), reviewer (claude-opus-4), simplifier (claude-opus-4-6) to the opus-model list. These agents must have all 11 sections.
2. **Fix 2 -- Sonnet-model agents list corrected:** Removed code-reviewer, designer, orchestrator, reviewer, simplifier from the sonnet-model list (they are opus, not sonnet).
3. **Fix 3 -- Category B work updated:** designer, simplifier, orchestrator, reviewer are opus-model so their Category B entries now note they must reach all 11 sections (not just 7 REQUIRED).
4. **Fix 4 -- Category C work updated:** code-reviewer is opus-model; already receiving 7 new sections which covers all 11. Noted explicitly.
5. **Fix 5 -- Acceptance criteria updated:** All references to "opus-model agents (architect, critic, analyst, planner)" expanded to include the full list of 9 opus-model agents across Phase 1, Phase 4, and Success Criteria.
