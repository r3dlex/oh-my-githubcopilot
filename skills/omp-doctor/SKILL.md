---
name: omp-doctor
description: Diagnose and fix oh-my-githubcopilot installation issues
trigger: /omp:omp-doctor
level: 3
---

# OMP Doctor Skill

## Task: Run Installation Diagnostics

You are the OMP Doctor — diagnose and fix installation issues for the oh-my-githubcopilot plugin.

### Step 1: Check Plugin Version

```bash
# Check installed plugin version
node -e "const p=require('path'),f=require('fs'),h=require('os').homedir(),b=p.join(h,'.config','github-copilot','plugins','oh-my-githubcopilot');try{const v=f.readdirSync(b).filter(x=>/^\d/.test(x)).sort((a,c)=>a.localeCompare(c,void 0,{numeric:true}));console.log('Installed:',v.length?v[v.length-1]:'(none)')}catch{console.log('Installed: (none)')}"
npm view oh-my-githubcopilot version 2>/dev/null || echo "Latest: (unavailable)"
```

**Diagnosis**:
- If no version installed: CRITICAL - plugin not installed
- If INSTALLED != LATEST: WARN - outdated plugin
- If multiple versions exist: WARN - stale cache

### Step 2: Check plugin.json

Read `~/.config/github-copilot/plugin.json` and verify:
- `oh-my-githubcopilot` is listed as an active plugin
- The version entry matches the installed version

**Diagnosis**:
- If plugin.json missing: CRITICAL - plugin not registered
- If `oh-my-githubcopilot` not listed: CRITICAL - plugin not activated
- If version mismatch: WARN - version drift

### Step 3: Check Skills Directory

```bash
ls -la ~/.config/github-copilot/plugins/oh-my-githubcopilot/skills/ 2>/dev/null
```

**Diagnosis**:
- If skills/ missing or empty: CRITICAL - skills not installed
- If known skills are missing entries: WARN - incomplete skill set

**Known skill names** (check skills/ for these):
`autopilot`, `configure-notifications`, `deep-interview`, `ecomode`, `graphify`, `graphwiki`, `hud`, `learner`, `mcp-setup`, `note`, `omp-doctor`, `omp-plan`, `omp-reference`, `omp-setup`, `pipeline`, `ralph`, `release`, `research`, `setup`, `spending`, `swarm`, `team`, `trace`, `ultrawork`, `wiki`

### Step 4: Check Agents Directory

```bash
ls -la ~/.config/github-copilot/plugins/oh-my-githubcopilot/agents/ 2>/dev/null
```

**Diagnosis**:
- If agents/ missing: CRITICAL - agents not installed
- If known agents are missing: WARN - incomplete agent set

**Known agent names** (check agents/ for these):
`explore`, `planner`, `executor`, `verifier`, `writer`, `designer`, `debugger`, `architect`, `security-reviewer`, `code-simplifier`, `test-engineer`, `critic`, `tracer`, `scientist`, `code-reviewer`, `document-specialist`, `qa-tester`, `git-master`, `analyst`

### Step 4b: Check for Stale Agent References (2.0 migration)

Run the built-in migration scan, which checks project config files (`.github/copilot-instructions.md`, `AGENTS.md`, `.omg/` state) for agent IDs that were renamed or dropped in OMP 2.0:

```bash
node bin/omp.mjs doctor
```

**Stale ID → replacement mapping**:

| Stale ID | Replacement |
|----------|-------------|
| `@explorer` | `@explore` |
| `@simplifier` | `@code-simplifier` |
| `@researcher` | `@document-specialist` |
| `@reviewer` | `@code-reviewer` |
| `@tester` | `@test-engineer` |
| `@orchestrator` | top-level orchestration role (no longer a delegatable agent) |

**Diagnosis**:
- If stale references found: WARN - suggest the replacement IDs above

### Step 5: Check AGENTS.md

```bash
ls -la ~/.config/github-copilot/plugins/oh-my-githubcopilot/AGENTS.md 2>/dev/null
```

**Diagnosis**:
- If AGENTS.md missing: WARN - orchestration brain not found

### Step 6: Check for Stale Plugin Cache

```bash
node -e "const p=require('path'),f=require('fs'),h=require('os').homedir(),b=p.join(h,'.config','github-copilot','plugins','oh-my-githubcopilot');try{const v=f.readdirSync(b).filter(x=>/^\d/.test(x));console.log(v.length+' version(s):',v.join(', '))}catch{console.log('0 versions')}"
```

**Diagnosis**:
- If > 1 version: WARN - multiple cached versions (cleanup recommended)

---

## Report Format

After running all checks, output a report:

```
## OMP Doctor Report

### Summary
[HEALTHY / ISSUES FOUND]

### Checks

| Check | Status | Details |
|-------|--------|---------|
| Plugin Version | OK/WARN/CRITICAL | ... |
| plugin.json Registration | OK/CRITICAL | ... |
| Skills Directory | OK/WARN/CRITICAL | ... |
| Agents Directory | OK/WARN/CRITICAL | ... |
| AGENTS.md | OK/WARN | ... |
| Plugin Cache | OK/WARN | ... |

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommended Fixes
[List fixes based on issues]
```

---

## Auto-Fix (if user confirms)

If issues found, ask user: "Would you like me to fix these issues automatically?"

If yes, apply fixes:

### Fix: Outdated Plugin

```bash
npm install -g oh-my-githubcopilot@latest
```

### Fix: Stale Cache (multiple versions)

```bash
node -e "const p=require('path'),f=require('fs'),h=require('os').homedir(),b=p.join(h,'.config','github-copilot','plugins','oh-my-githubcopilot');try{const v=f.readdirSync(b).filter(x=>/^\d/.test(x)).sort((a,c)=>a.localeCompare(c,void 0,{numeric:true}));v.slice(0,-1).forEach(x=>f.rmSync(p.join(b,x),{recursive:true,force:true}));console.log('Removed',v.length-1,'old version(s)')}catch(e){console.log('No cache to clean')}"
```

### Fix: Missing/Corrupt Installation

Re-run the setup skill:

```
/omp:omp-setup
```

---

## Post-Fix

After applying fixes, inform user:
> Fixes applied. **Restart GitHub Copilot CLI** for changes to take effect.
