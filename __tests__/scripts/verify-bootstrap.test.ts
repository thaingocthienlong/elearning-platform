import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

function readProjectFile(...segments: string[]) {
  return readFileSync(path.join(rootDir, ...segments), 'utf8');
}

describe('bootstrap verification script contract', () => {
  test('pins Node through .nvmrc and setup verifier minimum', () => {
    expect(readProjectFile('.nvmrc').trim()).toBe('20.11.1');

    const setupScript = readProjectFile('scripts', 'verify-setup.ts');

    expect(setupScript).toContain('20.9.0');
    expect(setupScript).toContain('package-lock.json');
    expect(setupScript).toContain('prisma/schema.prisma');
    expect(setupScript).toContain('verify:services:strict');
  });

  test('service verifier derives required variables from the env matrix', () => {
    expect(existsSync(path.join(rootDir, 'scripts', 'verify-services.ts'))).toBe(
      true
    );

    const serviceScript = readProjectFile('scripts', 'verify-services.ts');

    expect(serviceScript).toContain('docs/env-matrix.md');
    expect(serviceScript).toContain('--strict');
    expect(serviceScript).toContain('CI');
    expect(serviceScript).toContain('SKIP');
    expect(serviceScript).toContain('Database');
    expect(serviceScript).toContain('Public player/config');
  });
});
