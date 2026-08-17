export interface TemporaryMuxPlayback {
  playbackId: string;
  playerUrl: string;
  iframeTitle: string;
}

const PLAYBACKS: Readonly<Record<string, TemporaryMuxPlayback>> = {
  'video buoi 1': {
    playbackId: 'Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc',
    playerUrl: 'https://player.mux.com/Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc?metadata-video-title=video1448353709&video-title=video1448353709',
    iframeTitle: 'video1448353709',
  },
  'video buoi 2': {
    playbackId: 'rcckJNkDpVjKGcZz9kD3gFQ00j75pJMZOoWm4Z01HbFkI',
    playerUrl: 'https://player.mux.com/rcckJNkDpVjKGcZz9kD3gFQ00j75pJMZOoWm4Z01HbFkI?metadata-video-title=video1293633231&video-title=video1293633231',
    iframeTitle: 'video1293633231',
  },
  'video buoi 3': {
    playbackId: 'uTpirfGCW8hzK02FkCJYvj4eXWeb4bkYKAMgG02tlH6bw',
    playerUrl: 'https://player.mux.com/uTpirfGCW8hzK02FkCJYvj4eXWeb4bkYKAMgG02tlH6bw?metadata-video-title=video1634486089&video-title=video1634486089',
    iframeTitle: 'video1634486089',
  },
  'video buoi 4': {
    playbackId: 'F01QluvVYbhckxauduQkF69leqZ3aERdhEcGsxSEJnVc',
    playerUrl: 'https://player.mux.com/F01QluvVYbhckxauduQkF69leqZ3aERdhEcGsxSEJnVc?metadata-video-title=video1558523669&video-title=video1558523669',
    iframeTitle: 'video1558523669',
  },
};

function normalizeTitle(title: string | null | undefined): string {
  return (title ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveTemporaryMuxPlayback(title: string | null | undefined): TemporaryMuxPlayback | null {
  return PLAYBACKS[normalizeTitle(title)] ?? null;
}
