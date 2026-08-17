import { resolveTemporaryMuxPlayback } from '@/lib/temporary-mux-playback';

describe('resolveTemporaryMuxPlayback', () => {
  test.each([
    ['Video buổi 1', 'fP7nQIJz8nuf7Xpm4A168zxyu01DuvuE9bpedV8AzZeI', 'https://player.mux.com/fP7nQIJz8nuf7Xpm4A168zxyu01DuvuE9bpedV8AzZeI?metadata-video-title=video1448353709&video-title=video1448353709', 'video1448353709'],
    ['VIDEO BUỔI 2', 'KRFPLaZSWNiR6YBEPlzfenKlfc1ekEbDfe02ViIeZDFM', 'https://player.mux.com/KRFPLaZSWNiR6YBEPlzfenKlfc1ekEbDfe02ViIeZDFM?metadata-video-title=video1293633231&video-title=video1293633231', 'video1293633231'],
    ['Video   buổi 3', '2XBNATYPcdqKk7KAoHDmLEAreM1G64eQKWUysio9Z1M', 'https://player.mux.com/2XBNATYPcdqKk7KAoHDmLEAreM1G64eQKWUysio9Z1M?metadata-video-title=video1634486089&video-title=video1634486089', 'video1634486089'],
    ['Video buổi 4', 'eEY00T47o1MYsJ9Qh2tqSKTDaR8pzEgv6bcsSYgWlBVg', 'https://player.mux.com/eEY00T47o1MYsJ9Qh2tqSKTDaR8pzEgv6bcsSYgWlBVg?metadata-video-title=video1558523669&video-title=video1558523669', 'video1558523669'],
  ])('maps %s to its approved Mux player', (title, playbackId, playerUrl, iframeTitle) => {
    expect(resolveTemporaryMuxPlayback(title)).toMatchObject({ playbackId, playerUrl, iframeTitle });
  });

  test.each([
    ['Buổi 1 - Sáng 15.08.2026', 'fP7nQIJz8nuf7Xpm4A168zxyu01DuvuE9bpedV8AzZeI'],
    ['Buổi 2 - Chiều 15.08.2026', 'KRFPLaZSWNiR6YBEPlzfenKlfc1ekEbDfe02ViIeZDFM'],
    ['Buổi 3 - Sáng 16.08.2026', '2XBNATYPcdqKk7KAoHDmLEAreM1G64eQKWUysio9Z1M'],
    ['Buổi 4 - Chiều 16.08.2026', 'eEY00T47o1MYsJ9Qh2tqSKTDaR8pzEgv6bcsSYgWlBVg'],
  ])('maps the deployed course title %s to its Mux player', (title, playbackId) => {
    expect(resolveTemporaryMuxPlayback(title)).toMatchObject({ playbackId });
  });

  test('keeps non-session titles on the Tencent path', () => {
    expect(resolveTemporaryMuxPlayback('Video buổi 5')).toBeNull();
    expect(resolveTemporaryMuxPlayback(null)).toBeNull();
    expect(resolveTemporaryMuxPlayback(undefined)).toBeNull();
  });

  test('returns fresh playback data for each lookup', () => {
    const first = resolveTemporaryMuxPlayback('Video buổi 1');
    expect(first).not.toBeNull();

    first!.playbackId = 'mutated';
    first!.playerUrl = 'https://example.test/mutated';
    first!.iframeTitle = 'mutated';

    expect(resolveTemporaryMuxPlayback('Video buổi 1')).toMatchObject({
      playbackId: 'fP7nQIJz8nuf7Xpm4A168zxyu01DuvuE9bpedV8AzZeI',
      playerUrl: 'https://player.mux.com/fP7nQIJz8nuf7Xpm4A168zxyu01DuvuE9bpedV8AzZeI?metadata-video-title=video1448353709&video-title=video1448353709',
      iframeTitle: 'video1448353709',
    });
  });
});
