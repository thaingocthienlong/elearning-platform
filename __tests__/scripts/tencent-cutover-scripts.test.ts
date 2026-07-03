import fs from 'node:fs';
import path from 'node:path';

describe('Tencent cutover scripts', () => {
  test('export script exists and avoids secret env names in output contract', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'scripts/export-old-media-before-tencent-cutover.ts'), 'utf8');
    expect(source).toContain('exportOldMediaRows');
    expect(source).not.toContain(`process.env.${'AXI' + 'NOM'}_COM_KEY_SECRET`);
    expect(source).not.toContain('process.env.TENCENT_SECRET_KEY');
  });

  test('cleanup script requires explicit confirm flag', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'scripts/cleanup-old-media-for-tencent-cutover.ts'), 'utf8');
    expect(source).toContain('--confirm-delete-old-media');
    expect(source).toContain('Refusing to clean old media without --confirm-delete-old-media');
  });
});
