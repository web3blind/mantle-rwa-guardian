import { describe, expect, it, vi } from 'vitest';
import { isAutoDeployEnabled, resolveRepoRoot, runAutoDeployCheck } from '../src/autoDeploy.js';

describe('auto deploy', () => {
  it('parses opt-in environment values', () => {
    expect(isAutoDeployEnabled('true')).toBe(true);
    expect(isAutoDeployEnabled('1')).toBe(true);
    expect(isAutoDeployEnabled('yes')).toBe(true);
    expect(isAutoDeployEnabled('false')).toBe(false);
    expect(isAutoDeployEnabled(undefined)).toBe(false);
  });

  it('resolves the repository root from the module location', () => {
    expect(resolveRepoRoot('file:///srv/app/src/autoDeploy.ts')).toBe('/srv/app');
    expect(resolveRepoRoot('file:///srv/app/dist/autoDeploy.js')).toBe('/srv/app');
  });

  it('does nothing when local and remote revisions match', async () => {
    const commands: string[] = [];
    const result = await runAutoDeployCheck({
      branch: 'main',
      repoRoot: '/repo',
      logger: { log: vi.fn(), error: vi.fn() },
      runCommand: async (command, args) => {
        commands.push(`${command} ${args.join(' ')}`);
        if (args[0] === 'rev-parse') return 'abc123';
        return '';
      }
    });

    expect(result).toBe('up-to-date');
    expect(commands).toEqual([
      'git rev-parse HEAD',
      'git fetch --quiet origin main',
      'git rev-parse origin/main'
    ]);
  });

  it('updates, validates, and exits cleanly when a new revision exists', async () => {
    const commands: string[] = [];
    const exitProcess = vi.fn((code: number) => { throw new Error(`exit ${code}`); });

    await expect(runAutoDeployCheck({
      branch: 'main',
      repoRoot: '/repo',
      logger: { log: vi.fn(), error: vi.fn() },
      exitProcess,
      runCommand: async (command, args) => {
        commands.push(`${command} ${args.join(' ')}`);
        if (args.join(' ') === 'rev-parse HEAD') return 'local';
        if (args.join(' ') === 'rev-parse origin/main') return 'remote';
        return '';
      }
    })).rejects.toThrow('exit 0');

    expect(commands).toEqual([
      'git rev-parse HEAD',
      'git fetch --quiet origin main',
      'git rev-parse origin/main',
      'git reset --hard origin/main',
      'npm ci',
      'npm test',
      'npm run typecheck'
    ]);
    expect(exitProcess).toHaveBeenCalledWith(0);
  });
});
