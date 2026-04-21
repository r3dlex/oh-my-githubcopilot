# Open Questions

## doc-consistency - 2026-04-12

- [ ] Skill format choice: Should Format B files (YAML frontmatter) convert to Format A (table-based), or should all files convert to YAML frontmatter instead? Plan defaults to Format A (majority wins), but Format B is arguably cleaner. -- Affects 25 files if reversed.
- [ ] Should `<When_Active>` sections in Category C agents be kept as-is alongside the new sections, or folded into `<Role>`? -- Affects readability of 7 agent files.
- [ ] The `spec/AGENTS_SPEC.md` defines a different frontmatter template (id/name/tier/tools/role/description/entry) than what agents actually use (name/description/model/level/tools). Should the spec be updated to match reality, or should agents be updated to match the spec? -- This is an architectural decision beyond the scope of this plan but worth flagging.
- [ ] Should the README agent table (lines 78-86) be expanded to list all 23 agents, or keep the abbreviated 6-agent sample with "See AGENTS.md for full registry"? -- Affects README length and maintenance burden.

## npm-release-ci - 2026-04-12

- [ ] Confirm the exact list for the `files` field in `package.json` -- should `skills/` and `.claude-plugin/` be included in the npm tarball, or are they only relevant when cloning the repo? -- Affects package size and whether consumers get plugin metadata.
- [ ] Should a GitHub environment (`npm`) with protection rules (e.g., manual approval) be configured, or is tag-push gating sufficient? -- Affects security posture vs. release velocity tradeoff.
- [ ] The package name `oh-my-copilot` may not be available on npm yet -- verify availability before first publish attempt. -- Blocks the first real publish if the name is taken.

## continuous-release - 2026-04-12

- [ ] Should a PR-level CI check also validate CHANGELOG.md presence (earlier feedback than post-merge pipeline failure)? -- Affects developer experience; currently only the release pipeline checks.
- [ ] Should old alpha versions be pruned from npm on a schedule? -- npm has no built-in TTL; stale alphas accumulate indefinitely.
- [ ] The `plugin.json` version is currently `1.0.0` while `package.json` is `1.2.0` -- should this be fixed as part of this work or tracked separately? -- The stable release version-parity check will fail if these are out of sync.
- [ ] Should the `concurrency` group use `cancel-in-progress: true` for alpha releases (skip queuing, just cancel the older one)? -- Tradeoff between guaranteed publish of every commit vs. pipeline throughput.
