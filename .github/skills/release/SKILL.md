---
name: release
description: >
  Analyze repository release rules and guide safe versioning, changelog, packaging, and publish steps.
  Activate when: release, publish version, cut release, ship package, changelog.
argument-hint: "<release target or version>"
---

# Release

Use this skill to prepare a repository release without skipping verification or approval gates.

## Workflow
1. Detect release conventions from package manifests, changelogs, tags, and CI files.
2. Identify version bump type and impacted packages.
3. Prepare release notes or changelog entries from verified changes.
4. Run build, test, package, and smoke checks before publishing.
5. Ask for explicit approval before destructive or irreversible publish actions.

## Approval Gates
- Version changes
- Tag creation
- Package publishing
- Production deployment

## Rules
- Never publish, tag, or push release artifacts without explicit user approval.
- Do not hide failing tests under a release note.
- Record commands run and evidence collected.
