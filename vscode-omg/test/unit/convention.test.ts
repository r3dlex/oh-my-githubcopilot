import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  checkConventionFiles,
  checkVersionDrift,
  listAgents,
  copyDirRecursive,
} from '../../src/utils/convention';

describe('convention', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omg-conv-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('checkConventionFiles', () => {
    it('reports all errors when workspace is empty', () => {
      const issues = checkConventionFiles(tmpDir);
      const errors = issues.filter(i => i.severity === 'error');
      // Missing: copilot-instructions.md, pre-tool-use.sh, post-tool-use.sh, agents dir, skills dir, mcp-server/package.json
      expect(errors.length).toBeGreaterThanOrEqual(5);
    });

    it('reports no errors when fully configured', () => {
      setupFullWorkspace(tmpDir);
      const issues = checkConventionFiles(tmpDir);
      const errors = issues.filter(i => i.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('warns when agent count is less than 20', () => {
      setupFullWorkspace(tmpDir, { agentCount: 5 });
      const issues = checkConventionFiles(tmpDir);
      const warnings = issues.filter(i => i.severity === 'warning');
      expect(warnings.some(w => w.message.includes('5/20'))).toBe(true);
    });

    it('emits info when agent count is between 20 and 27 (extended tier)', () => {
      setupFullWorkspace(tmpDir, { agentCount: 22 });
      const issues = checkConventionFiles(tmpDir);
      const warnings = issues.filter(i => i.severity === 'warning');
      const infos = issues.filter(i => i.severity === 'info');
      expect(warnings.some(w => w.message.includes('agent'))).toBe(false);
      expect(infos.some(i => i.message.includes('22/28'))).toBe(true);
    });

    it('emits no agent issues when count is 28 or more', () => {
      setupFullWorkspace(tmpDir, { agentCount: 28 });
      const issues = checkConventionFiles(tmpDir);
      expect(issues.filter(i => i.message.includes('agent'))).toHaveLength(0);
    });

    it('warns when skill count is less than 24', () => {
      setupFullWorkspace(tmpDir, { skillCount: 3 });
      const issues = checkConventionFiles(tmpDir);
      const warnings = issues.filter(i => i.severity === 'warning');
      expect(warnings.some(w => w.message.includes('3/24'))).toBe(true);
    });

    it('emits info when skill count is between 24 and 36 (extended tier)', () => {
      setupFullWorkspace(tmpDir, { skillCount: 26 });
      const issues = checkConventionFiles(tmpDir);
      const warnings = issues.filter(i => i.severity === 'warning');
      const infos = issues.filter(i => i.severity === 'info');
      expect(warnings.some(w => w.message.includes('skill'))).toBe(false);
      expect(infos.some(i => i.message.includes('26/37'))).toBe(true);
    });

    it('emits info at current core skill count until extended skills are installed', () => {
      setupFullWorkspace(tmpDir, { skillCount: 24 });
      const issues = checkConventionFiles(tmpDir);
      const warnings = issues.filter(i => i.severity === 'warning');
      const infos = issues.filter(i => i.severity === 'info');
      expect(warnings.some(w => w.message.includes('skill'))).toBe(false);
      expect(infos.some(i => i.message.includes('24/37'))).toBe(true);
    });

    it('emits no skill issues when count is 37 or more', () => {
      setupFullWorkspace(tmpDir, { skillCount: 37 });
      const issues = checkConventionFiles(tmpDir);
      expect(issues.filter(i => i.message.includes('skill'))).toHaveLength(0);
    });

    it('warns when MCP server not built', () => {
      setupFullWorkspace(tmpDir, { mcpBuilt: false });
      const issues = checkConventionFiles(tmpDir);
      const warnings = issues.filter(i => i.severity === 'warning');
      expect(warnings.some(w => w.message.includes('not built'))).toBe(true);
    });

    it('reports no errors or warnings when fully configured at core counts', () => {
      setupFullWorkspace(tmpDir);
      const issues = checkConventionFiles(tmpDir);
      const blocking = issues.filter(i => i.severity === 'error' || i.severity === 'warning');
      // Info-level messages (optional upgrade nudges) are acceptable
      expect(blocking).toHaveLength(0);
    });
  });

  describe('checkVersionDrift', () => {
    it('returns null when files do not exist', () => {
      const result = checkVersionDrift(
        path.join(tmpDir, 'a.json'),
        path.join(tmpDir, 'b.json'),
      );
      expect(result).toBeNull();
    });

    it('returns null when versions match', () => {
      const a = path.join(tmpDir, 'a.json');
      const b = path.join(tmpDir, 'b.json');
      fs.writeFileSync(a, JSON.stringify({ version: '1.0.0' }));
      fs.writeFileSync(b, JSON.stringify({ version: '1.0.0' }));
      const result = checkVersionDrift(a, b);
      expect(result).toBeNull();
    });

    it('returns info issue when versions differ', () => {
      const a = path.join(tmpDir, 'a.json');
      const b = path.join(tmpDir, 'b.json');
      fs.writeFileSync(a, JSON.stringify({ version: '2.0.0' }));
      fs.writeFileSync(b, JSON.stringify({ version: '1.0.0' }));
      const result = checkVersionDrift(a, b);
      expect(result).not.toBeNull();
      expect(result!.severity).toBe('info');
      expect(result!.message).toContain('version drift');
    });
  });

  describe('listAgents', () => {
    it('returns empty array when dir does not exist', () => {
      expect(listAgents(path.join(tmpDir, 'nope'))).toEqual([]);
    });

    it('lists agent files with parsed descriptions', () => {
      const agentsDir = path.join(tmpDir, 'agents');
      fs.mkdirSync(agentsDir, { recursive: true });

      fs.writeFileSync(
        path.join(agentsDir, 'architect.agent.md'),
        `---
name: architect
description: >
  Architecture analysis and debugging guidance.
---
# Architect`,
      );

      fs.writeFileSync(
        path.join(agentsDir, 'executor.agent.md'),
        `---
name: executor
description: >
  Focused task implementation.
---
# Executor`,
      );

      const agents = listAgents(agentsDir);
      expect(agents).toHaveLength(2);
      expect(agents[0].name).toBe('architect');
      expect(agents[0].description).toBe('Architecture analysis and debugging guidance.');
      expect(agents[1].name).toBe('executor');
    });

    it('ignores non .agent.md files', () => {
      const agentsDir = path.join(tmpDir, 'agents');
      fs.mkdirSync(agentsDir, { recursive: true });
      fs.writeFileSync(path.join(agentsDir, 'readme.md'), '# Agents');
      fs.writeFileSync(path.join(agentsDir, 'test.agent.md'), '---\nname: test\n---\n# Test');

      const agents = listAgents(agentsDir);
      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('test');
    });
  });

  describe('copyDirRecursive', () => {
    it('copies flat directory', () => {
      const src = path.join(tmpDir, 'src');
      const dest = path.join(tmpDir, 'dest');
      fs.mkdirSync(src);
      fs.writeFileSync(path.join(src, 'a.txt'), 'hello');
      fs.writeFileSync(path.join(src, 'b.txt'), 'world');

      copyDirRecursive(src, dest);

      expect(fs.readFileSync(path.join(dest, 'a.txt'), 'utf-8')).toBe('hello');
      expect(fs.readFileSync(path.join(dest, 'b.txt'), 'utf-8')).toBe('world');
    });

    it('copies nested directories', () => {
      const src = path.join(tmpDir, 'src');
      fs.mkdirSync(path.join(src, 'sub', 'deep'), { recursive: true });
      fs.writeFileSync(path.join(src, 'root.txt'), 'r');
      fs.writeFileSync(path.join(src, 'sub', 'mid.txt'), 'm');
      fs.writeFileSync(path.join(src, 'sub', 'deep', 'leaf.txt'), 'l');

      const dest = path.join(tmpDir, 'dest');
      copyDirRecursive(src, dest);

      expect(fs.readFileSync(path.join(dest, 'root.txt'), 'utf-8')).toBe('r');
      expect(fs.readFileSync(path.join(dest, 'sub', 'mid.txt'), 'utf-8')).toBe('m');
      expect(fs.readFileSync(path.join(dest, 'sub', 'deep', 'leaf.txt'), 'utf-8')).toBe('l');
    });

    it('overwrites existing files in destination', () => {
      const src = path.join(tmpDir, 'src');
      const dest = path.join(tmpDir, 'dest');
      fs.mkdirSync(src);
      fs.mkdirSync(dest);

      fs.writeFileSync(path.join(dest, 'file.txt'), 'old');
      fs.writeFileSync(path.join(src, 'file.txt'), 'new');

      copyDirRecursive(src, dest);
      expect(fs.readFileSync(path.join(dest, 'file.txt'), 'utf-8')).toBe('new');
    });
  });
});

// --- Helper to set up a full workspace ---

function setupFullWorkspace(
  root: string,
  opts: { agentCount?: number; skillCount?: number; mcpBuilt?: boolean } = {},
) {
  const { agentCount = 20, skillCount = 24, mcpBuilt = true } = opts;

  // Required files
  fs.mkdirSync(path.join(root, '.github', 'hooks'), { recursive: true });
  fs.writeFileSync(path.join(root, '.github', 'copilot-instructions.md'), '# OMG');
  fs.writeFileSync(path.join(root, '.github', 'hooks', 'pre-tool-use.sh'), '#!/bin/bash');
  fs.writeFileSync(path.join(root, '.github', 'hooks', 'post-tool-use.sh'), '#!/bin/bash');

  // Agents
  const agentsDir = path.join(root, '.github', 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });
  const agentNames = [
    'architect', 'executor', 'planner', 'analyst', 'debugger',
    'verifier', 'code-reviewer', 'security-reviewer', 'test-engineer', 'designer',
    'writer', 'qa-tester', 'scientist', 'tracer', 'git-master',
    'code-simplifier', 'critic', 'document-specialist', 'explore', 'omg-coordinator',
    // Extended (Phase 2 language reviewers)
    'typescript-reviewer', 'python-reviewer', 'rust-reviewer', 'go-reviewer',
    'java-reviewer', 'csharp-reviewer', 'swift-reviewer', 'database-reviewer',
  ];
  for (let i = 0; i < agentCount; i++) {
    const name = agentNames[i] || `agent-${i}`;
    fs.writeFileSync(
      path.join(agentsDir, `${name}.agent.md`),
      `---\nname: ${name}\ndescription: >\n  Test agent ${name}.\n---\n# ${name}`,
    );
  }

  // Skills
  const skillsDir = path.join(root, '.github', 'skills');
  fs.mkdirSync(skillsDir, { recursive: true });
  const skillNames = [
    'omg-autopilot', 'ralph', 'ultrawork', 'plan', 'ralplan',
    'team', 'ccg', 'deep-interview', 'deep-dive', 'trace',
    'verify', 'review', 'ultraqa', 'ai-slop-cleaner', 'self-improve',
    'remember', 'cancel', 'status',
    // Extended (Phase 3 new skills)
    'tdd', 'search-first', 'coding-standards', 'security-scan',
  ];
  for (let i = 0; i < skillCount; i++) {
    const name = skillNames[i] || `skill-${i}`;
    const dir = path.join(skillsDir, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), `# ${name}\nTest skill.`);
  }

  // MCP server
  const mcpDir = path.join(root, 'mcp-server');
  fs.mkdirSync(mcpDir, { recursive: true });
  fs.writeFileSync(path.join(mcpDir, 'package.json'), JSON.stringify({ name: 'omg-mcp-server', version: '1.0.0' }));
  if (mcpBuilt) {
    fs.mkdirSync(path.join(mcpDir, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(mcpDir, 'dist', 'index.js'), '// built');
  }
}
