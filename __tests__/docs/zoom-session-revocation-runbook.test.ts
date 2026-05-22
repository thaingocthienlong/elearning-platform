import { readFileSync } from 'fs';
import path from 'path';

describe('Zoom runbook session revocation smoke test', () => {
  test('documents the two-device meeting revocation check', () => {
    const docs = readFileSync(
      path.join(process.cwd(), 'docs/zoom-meeting-sdk-runbook.md'),
      'utf8'
    );

    expect(docs).toContain('Two-device session revocation smoke test');
    expect(docs).toContain('iPhone Safari');
    expect(docs).toContain('Windows Chrome');
    expect(docs).toContain('15 seconds');
    expect(docs).toContain('SessionRevoked');
  });
});
