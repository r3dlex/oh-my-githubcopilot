#!/usr/bin/env node

/**
 * Sync templates from the repository's .github/ and mcp-server/ into
 * the extension's resources/templates/ directory.
 *
 * Run before `vsce package` to ensure templates are up-to-date.
 */

import { cpSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const repoRoot = resolve(import.meta.dirname, '..', '..');
const templatesDir = resolve(import.meta.dirname, '..', 'resources', 'templates');

const items = [
  { src: '.github/copilot-instructions.md', dest: 'copilot-instructions.md', isDir: false },
  { src: '.github/agents', dest: 'agents', isDir: true },
  { src: '.github/skills', dest: 'skills', isDir: true },
  { src: '.github/hooks', dest: 'hooks', isDir: true },
  { src: '.github/prompts', dest: 'prompts', isDir: true },
  { src: 'mcp-server', dest: 'mcp-server', isDir: true },
];

console.log('Syncing templates...');
console.log(`  Repo root: ${repoRoot}`);
console.log(`  Templates dir: ${templatesDir}`);

mkdirSync(templatesDir, { recursive: true });

for (const item of items) {
  const srcPath = join(repoRoot, item.src);
  const destPath = join(templatesDir, item.dest);

  if (!existsSync(srcPath)) {
    console.warn(`  ⚠ Source not found: ${item.src}`);
    continue;
  }

  if (item.isDir) {
    cpSync(srcPath, destPath, {
      recursive: true,
      filter: (src) => {
        // Skip node_modules and dist from mcp-server
        return !src.includes('node_modules') && !src.includes('/dist/');
      },
    });
  } else {
    mkdirSync(join(destPath, '..'), { recursive: true });
    cpSync(srcPath, destPath);
  }

  console.log(`  ✓ ${item.src} → templates/${item.dest}`);
}

console.log('Templates synced successfully.');
