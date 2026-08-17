import { resolveTemporaryMuxPlayback } from '@/lib/temporary-mux-playback';

describe('resolveTemporaryMuxPlayback', () => {
  test.each([
    ['Video buổi 1', 'Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc', 'https://player.mux.com/Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc?metadata-video-title=video1448353709&video-title=video1448353709'],
    ['VIDEO BUỔI 2', 'rcckJNkDpVjKGcZz9kD3gFQ00j75pJMZOoWm4Z01HbFkI', 'https://player.mux.com/rcckJNkDpVjKGcZz9kD3gFQ00j75pJMZOoWm4Z01HbFkI?metadata-video-title=video1293633231&video-title=video1293633231'],
    ['Video   buổi 3', 'uTpirfGCW8hzK02FkCJYvj4eXWeb4bkYKAMgG02tlH6bw', 'https://player.mux.com/uTpirfGCW8hzK02FkCJYvj4eXWeb4bkYKAMgG02tlH6bw?metadata-video-title=video1634486089&video-title=video1634486089'],
    ['Video buổi 4', 'F01QluvVYbhckxauduQkF69leqZ3aERdhEcGsxSEJnVc', 'https://player.mux.com/F01QluvVYbhckxauduQkF69leqZ3aERdhEcGsxSEJnVc?metadata-video-title=video1558523669&video-title=video1558523669'],
  ])('maps %s to its approved Mux player', (title, playbackId, playerUrl) => {
    expect(resolveTemporaryMuxPlayback(title)).toMatchObject({ playbackId, playerUrl });
  });

  test('keeps non-session titles on the Tencent path', () => {
    expect(resolveTemporaryMuxPlayback('Video buổi 5')).toBeNull();
    expect(resolveTemporaryMuxPlayback(undefined)).toBeNull();
  });
});
