import fs from 'node:fs';
import path from 'node:path';

function getVideoProviderEnumBlock() {
  const schema = fs.readFileSync(
    path.join(process.cwd(), 'prisma', 'schema.prisma'),
    'utf8'
  );
  const match = schema.match(/enum\s+VideoProvider\s*\{([^}]+)\}/);
  if (!match?.[1]) {
    throw new Error('VideoProvider enum not found');
  }
  return match[1];
}

describe('VideoProvider enum compatibility', () => {
  test('keeps legacy VDOCIPHER rows readable during Bunny migration', () => {
    expect(getVideoProviderEnumBlock()).toContain('VDOCIPHER');
  });
});
