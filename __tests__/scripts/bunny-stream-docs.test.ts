import fs from 'node:fs';

describe('Bunny Stream docs and scripts', () => {
  test('package scripts include Bunny verifier', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    expect(pkg.scripts['verify:bunny-stream']).toBe(
      'tsx scripts/verify-bunny-stream-setup.ts'
    );
  });

  test('env matrix documents Bunny Stream required and optional values', () => {
    const matrix = fs.readFileSync('docs/env-matrix.md', 'utf8');

    for (const variable of [
      'BUNNY_STREAM_LIBRARY_ID',
      'BUNNY_STREAM_API_KEY',
      'BUNNY_STREAM_READ_ONLY_API_KEY',
      'BUNNY_STREAM_TOKEN_SECURITY_KEY',
      'BUNNY_STREAM_API_TIMEOUT_MS',
      'BUNNY_STREAM_TUS_EXPIRE_SECONDS',
      'BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS',
      'BUNNY_STREAM_PULL_ZONE_HOSTNAME',
      'BUNNY_STREAM_DEFAULT_COLLECTION_ID',
    ]) {
      expect(matrix).toContain(variable);
    }
  });

  test('setup and staging docs mention Bunny security controls and routes', () => {
    const setup = fs.readFileSync('docs/bunny-stream-setup.md', 'utf8');
    const staging = fs.readFileSync('docs/bunny-stream-staging-checklist.md', 'utf8');
    const smoke = fs.readFileSync('docs/staging-smoke-checklist.md', 'utf8');
    const subsystems = fs.readFileSync('docs/operations/subsystems.md', 'utf8');
    const upgrades = fs.readFileSync('docs/operations/vendor-upgrades.md', 'utf8');
    const health = fs.readFileSync('docs/operations/health-checklist.md', 'utf8');

    expect(setup).toContain('MediaCage Enterprise DRM');
    expect(setup).toContain('embed view token authentication');
    expect(setup).toContain('Early-Play');
    expect(setup).toContain('/api/video/bunny-stream/playback');
    expect(setup).toContain('/api/webhook/bunny-stream');
    expect(setup).toContain('uploadRequestId');
    expect(setup).toContain('allowed domains');
    expect(setup).toContain('player.js');

    expect(staging).toContain('/api/webhook/bunny-stream');
    expect(staging).toContain('allowed domains');
    expect(staging).toContain('MediaCage Enterprise DRM');

    expect(smoke).toContain('/api/video/bunny-stream/playback');
    expect(smoke).toContain('/api/webhook/bunny-stream');

    expect(subsystems).toContain('Bunny Stream');
    expect(upgrades).toContain('Bunny Stream');
    expect(health).toContain('Bunny Stream');
  });

  test('setup doc includes official Bunny Stream documentation links', () => {
    const setup = fs.readFileSync('docs/bunny-stream-setup.md', 'utf8');

    for (const url of [
      'https://docs.bunny.net/docs/stream-quickstart-guide',
      'https://docs.bunny.net/stream/authentication',
      'https://docs.bunny.net/stream/tus-resumable-uploads',
      'https://docs.bunny.net/stream/drm',
      'https://docs.bunny.net/docs/stream-embed-token-authentication',
      'https://docs.bunny.net/stream/playback-api',
      'https://docs.bunny.net/stream/webhooks',
    ]) {
      expect(setup).toContain(url);
    }
  });
});
