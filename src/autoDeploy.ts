import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface AutoDeployOptions {
  branch?: string;
  intervalMs?: number;
  repoRoot?: string;
  exitProcess?: (code: number) => never;
  runCommand?: (command: string, args: string[], cwd: string) => Promise<string>;
  logger?: Pick<typeof console, 'log' | 'error'>;
}

interface AutoDeployState {
  timer: NodeJS.Timeout;
  checkNow: () => Promise<void>;
}

const DEFAULT_BRANCH = 'main';
const DEFAULT_INTERVAL_MS = 60_000;

export function isAutoDeployEnabled(value = process.env.AUTO_DEPLOY): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value || '').toLowerCase());
}

export function resolveRepoRoot(moduleUrl = import.meta.url): string {
  return resolve(dirname(fileURLToPath(moduleUrl)), '..');
}

function defaultRunCommand(command: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolveOutput, reject) => {
    execFile(command, args, { cwd, env: process.env, maxBuffer: 1024 * 1024 * 8 }, (error, stdout, stderr) => {
      const output = `${stdout}${stderr}`;
      if (error) {
        reject(new Error(`${command} ${args.join(' ')} failed\n${output}`.trim()));
        return;
      }
      resolveOutput(output.trim());
    });
  });
}

export async function runAutoDeployCheck(options: AutoDeployOptions = {}): Promise<'up-to-date' | 'updated'> {
  const branch = options.branch || process.env.AUTO_DEPLOY_BRANCH || DEFAULT_BRANCH;
  const repoRoot = options.repoRoot || resolveRepoRoot();
  const runCommand = options.runCommand || defaultRunCommand;
  const logger = options.logger || console;
  const exitProcess = options.exitProcess || ((code: number): never => process.exit(code));

  const currentRev = (await runCommand('git', ['rev-parse', 'HEAD'], repoRoot)).trim();
  logger.log(`[auto-deploy] checking origin/${branch} from ${currentRev}`);
  await runCommand('git', ['fetch', '--quiet', 'origin', branch], repoRoot);
  const remoteRev = (await runCommand('git', ['rev-parse', `origin/${branch}`], repoRoot)).trim();

  if (currentRev === remoteRev) {
    logger.log(`[auto-deploy] already up to date (${currentRev})`);
    return 'up-to-date';
  }

  logger.log(`[auto-deploy] new commit detected: ${currentRev} -> ${remoteRev}`);
  await runCommand('git', ['reset', '--hard', `origin/${branch}`], repoRoot);
  await runCommand('npm', ['ci'], repoRoot);
  await runCommand('npm', ['test'], repoRoot);
  await runCommand('npm', ['run', 'typecheck'], repoRoot);

  logger.log('[auto-deploy] update validated; exiting for process manager restart');
  exitProcess(0);
  return 'updated';
}

export function startAutoDeployWatcher(options: AutoDeployOptions = {}): AutoDeployState {
  const intervalMs = options.intervalMs || Number(process.env.AUTO_DEPLOY_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  const logger = options.logger || console;
  let running = false;

  const checkNow = async () => {
    if (running) {
      logger.log('[auto-deploy] previous check still running; skip');
      return;
    }
    running = true;
    try {
      await runAutoDeployCheck(options);
    } catch (error) {
      logger.error('[auto-deploy] update check failed; keeping current process alive', error);
    } finally {
      running = false;
    }
  };

  logger.log(`[auto-deploy] watcher enabled; interval ${intervalMs}ms`);
  const timer = setInterval(() => { void checkNow(); }, intervalMs);
  timer.unref?.();
  void checkNow();
  return { timer, checkNow };
}
