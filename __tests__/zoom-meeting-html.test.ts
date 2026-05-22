import { readFileSync } from 'fs';
import path from 'path';

describe('Zoom meeting iframe revocation handler', () => {
  test('accepts same-origin leave command and calls Zoom leaveMeeting directly', () => {
    const html = readFileSync(
      path.join(process.cwd(), 'public/zoom-meeting.html'),
      'utf8'
    );

    expect(html).toContain("type !== 'platform:leave-meeting'");
    expect(html).toContain('event.origin !== window.location.origin');
    expect(html).toContain('ZoomMtg.leaveMeeting');
    expect(html).toContain('confirm: false');
    expect(html).toContain('/auth/signin?error=SessionRevoked');
  });
});
