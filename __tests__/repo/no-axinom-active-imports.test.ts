import fs from 'node:fs';
import path from 'node:path';

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(entry.name)) return [];
      return walk(full);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe('Axinom removal', () => {
  test('active source no longer imports Axinom modules', () => {
    const offenders = walk(path.join(process.cwd(), 'src'))
      .filter((file) => !file.includes(`${path.sep}archive${path.sep}`))
      .filter((file) => /axinom/i.test(fs.readFileSync(file, 'utf8')));

    expect(offenders).toEqual([]);
  });
});
