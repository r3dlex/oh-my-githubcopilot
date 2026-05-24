import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getActiveWorkflows, readPrd } from '../../src/utils/omc-reader';

describe('omc-reader', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omg-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('getActiveWorkflows', () => {
    it('returns empty array when state dir does not exist', () => {
      const result = getActiveWorkflows(path.join(tmpDir, 'nonexistent'));
      expect(result).toEqual([]);
    });

    it('returns empty array when state dir is empty', () => {
      const stateDir = path.join(tmpDir, 'state');
      fs.mkdirSync(stateDir, { recursive: true });
      const result = getActiveWorkflows(stateDir);
      expect(result).toEqual([]);
    });

    it('returns active workflows only', () => {
      const stateDir = path.join(tmpDir, 'state');
      fs.mkdirSync(stateDir, { recursive: true });

      // Active workflow
      fs.writeFileSync(
        path.join(stateDir, 'omg-autopilot-state.json'),
        JSON.stringify({ active: true, current_phase: 2, phase_name: 'execution' }),
      );

      // Inactive workflow
      fs.writeFileSync(
        path.join(stateDir, 'ralph-state.json'),
        JSON.stringify({ active: false }),
      );

      const result = getActiveWorkflows(stateDir);
      expect(result).toHaveLength(1);
      expect(result[0].mode).toBe('omg-autopilot');
      expect(result[0].current_phase).toBe(2);
      expect(result[0].phase_name).toBe('execution');
    });

    it('returns multiple active workflows', () => {
      const stateDir = path.join(tmpDir, 'state');
      fs.mkdirSync(stateDir, { recursive: true });

      fs.writeFileSync(
        path.join(stateDir, 'omg-autopilot-state.json'),
        JSON.stringify({ active: true, current_phase: 3 }),
      );
      fs.writeFileSync(
        path.join(stateDir, 'team-state.json'),
        JSON.stringify({ active: true, phase_name: 'planning' }),
      );

      const result = getActiveWorkflows(stateDir);
      expect(result).toHaveLength(2);
      expect(result.map(w => w.mode).sort()).toEqual(['omg-autopilot', 'team']);
    });

    it('skips malformed JSON files', () => {
      const stateDir = path.join(tmpDir, 'state');
      fs.mkdirSync(stateDir, { recursive: true });

      fs.writeFileSync(path.join(stateDir, 'bad-state.json'), 'not json{{{');
      fs.writeFileSync(
        path.join(stateDir, 'good-state.json'),
        JSON.stringify({ active: true }),
      );

      const result = getActiveWorkflows(stateDir);
      expect(result).toHaveLength(1);
      expect(result[0].mode).toBe('good');
    });

    it('ignores non -state.json files', () => {
      const stateDir = path.join(tmpDir, 'state');
      fs.mkdirSync(stateDir, { recursive: true });

      fs.writeFileSync(path.join(stateDir, 'notes.txt'), 'hello');
      fs.writeFileSync(path.join(stateDir, 'other.json'), JSON.stringify({ active: true }));

      const result = getActiveWorkflows(stateDir);
      expect(result).toEqual([]);
    });
  });

  describe('readPrd', () => {
    it('returns null when file does not exist', () => {
      const result = readPrd(path.join(tmpDir, 'prd.json'));
      expect(result).toBeNull();
    });

    it('reads valid PRD', () => {
      const prdPath = path.join(tmpDir, 'prd.json');
      const prd = {
        title: 'Test PRD',
        stories: [
          { id: 'story-1', title: 'First story', passes: false },
          { id: 'story-2', title: 'Second story', passes: true },
        ],
      };
      fs.writeFileSync(prdPath, JSON.stringify(prd));

      const result = readPrd(prdPath);
      expect(result).not.toBeNull();
      expect(result!.title).toBe('Test PRD');
      expect(result!.stories).toHaveLength(2);
      expect(result!.stories[1].passes).toBe(true);
    });

    it('returns null for malformed JSON', () => {
      const prdPath = path.join(tmpDir, 'prd.json');
      fs.writeFileSync(prdPath, 'not valid json!!!');
      const result = readPrd(prdPath);
      expect(result).toBeNull();
    });
  });
});
