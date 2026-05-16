import { readFileSync } from 'fs';
import path from 'path';

describe('meeting page session revocation bridge', () => {
  test('listens for session revocation and posts a leave message to the Zoom iframe', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/app/meeting/page.tsx'),
      'utf8'
    );

    expect(source).toContain('SESSION_REVOKED_EVENT');
    expect(source).toContain("type: 'platform:leave-meeting'");
    expect(source).toContain('iframeRef.current?.contentWindow?.postMessage');
    expect(source).toContain('window.location.origin');
    expect(source).toContain('ref={iframeRef}');
  });
});
