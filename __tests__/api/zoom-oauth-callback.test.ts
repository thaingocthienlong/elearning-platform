/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GET as zoomOauthCallbackGet } from '@/app/api/zoom/oauth/callback/route';

describe('Zoom OAuth callback route', () => {
  test('acknowledges Zoom Local Test redirects without storing OAuth codes', async () => {
    const response = await zoomOauthCallbackGet();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
    });
  });

  test('keeps NextAuth OAuth debug logging opt-in', () => {
    const authSource = readFileSync(join(process.cwd(), 'src/lib/auth.ts'), 'utf8');

    expect(authSource).toContain("debug: process.env.NEXTAUTH_DEBUG === 'true'");
    expect(authSource).not.toContain("debug: process.env.NODE_ENV === 'development'");
  });
});
