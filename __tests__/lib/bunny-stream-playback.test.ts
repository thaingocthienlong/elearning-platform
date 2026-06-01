import { createBunnyStreamPlayback } from '@/lib/bunny-stream/playback';
import { generateBunnyEmbedToken } from '@/lib/bunny-stream/signing';

describe('Bunny Stream playback', () => {
  test('builds a signed embed url with encoded path segments and player flags', () => {
    const now = new Date('2026-06-01T00:00:00.000Z');
    const playback = createBunnyStreamPlayback({
      libraryId: '759/alpha',
      videoId: 'video guid/1',
      tokenSecurityKey: 'token-key',
      embedTokenTtlSeconds: 300,
      now,
    });

    const expires = Math.floor(now.getTime() / 1000) + 300;
    const token = generateBunnyEmbedToken({
      tokenSecurityKey: 'token-key',
      videoId: 'video guid/1',
      expires,
    });

    expect(playback).toEqual({
      embedUrl:
        'https://player.mediadelivery.net/embed/759%2Falpha/video%20guid%2F1?token=' +
        `${token}&expires=${expires}&autoplay=false&preload=true&responsive=true`,
      libraryId: '759/alpha',
      videoId: 'video guid/1',
      token,
      expires,
      autoplay: false,
      preload: true,
      responsive: true,
    });
  });

  test('rejects empty path segments and non-positive ttl values', () => {
    expect(() =>
      createBunnyStreamPlayback({
        libraryId: ' ',
        videoId: 'video-guid',
        tokenSecurityKey: 'token-key',
        embedTokenTtlSeconds: 300,
      })
    ).toThrow('libraryId is required for Bunny Stream playback.');

    expect(() =>
      createBunnyStreamPlayback({
        libraryId: '123',
        videoId: '',
        tokenSecurityKey: 'token-key',
        embedTokenTtlSeconds: 300,
      })
    ).toThrow('videoId is required for Bunny Stream playback.');

    expect(() =>
      createBunnyStreamPlayback({
        libraryId: '123',
        videoId: 'video-guid',
        tokenSecurityKey: 'token-key',
        embedTokenTtlSeconds: 0,
      })
    ).toThrow('embedTokenTtlSeconds must be a positive integer.');
  });
});
