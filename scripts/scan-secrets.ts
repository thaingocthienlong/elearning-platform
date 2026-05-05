import { spawnSync } from 'node:child_process';

const strict = process.argv.includes('--strict') || process.env.CI === 'true';

function hasCommand(command: string): boolean {
  const lookup = process.platform === 'win32' ? 'where.exe' : 'command';
  const args = process.platform === 'win32' ? [command] : ['-v', command];
  const result = spawnSync(lookup, args, { stdio: 'ignore', shell: process.platform !== 'win32' });
  return result.status === 0;
}

if (!hasCommand('gitleaks')) {
  console.log('gitleaks is not installed; redacted secret pattern scan was skipped.');
  console.log('Install gitleaks, then rerun: npm run secrets:scan');
  console.log('Strict or CI mode requires gitleaks to be available.');
  process.exit(strict ? 1 : 0);
}

const result = spawnSync(
  'gitleaks',
  ['detect', '--source', '.', '--redact', '--no-banner'],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
);

if (result.error) {
  console.error(`gitleaks failed to start: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
