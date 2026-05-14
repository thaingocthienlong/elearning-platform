import fs from 'node:fs';
import path from 'node:path';

describe('FairPlay key system configuration', () => {
  test('uses Modern EME FairPlay key system in player code', () => {
    const files = [
      'src/lib/drm-detection.ts',
      'src/hooks/player/useShakaPlayer.ts',
    ];

    for (const file of files) {
      const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      expect(source).not.toContain('com.apple.fps.1_0');
    }
  });
});
