export interface TemporaryMuxPlayback {
  playbackId: string;
  playerUrl: string;
  iframeTitle: string;
}

const PLAYBACKS: Readonly<Record<string, TemporaryMuxPlayback>> = {
  'video buoi 1': {
    playbackId: 'fP7nQIJz8nuf7Xpm4A168zxyu01DuvuE9bpedV8AzZeI',
    playerUrl: 'https://player.mux.com/fP7nQIJz8nuf7Xpm4A168zxyu01DuvuE9bpedV8AzZeI?metadata-video-title=video1448353709&video-title=video1448353709',
    iframeTitle: 'video1448353709',
  },
  'video buoi 2': {
    playbackId: 'KRFPLaZSWNiR6YBEPlzfenKlfc1ekEbDfe02ViIeZDFM',
    playerUrl: 'https://player.mux.com/KRFPLaZSWNiR6YBEPlzfenKlfc1ekEbDfe02ViIeZDFM?metadata-video-title=video1293633231&video-title=video1293633231',
    iframeTitle: 'video1293633231',
  },
  'video buoi 3': {
    playbackId: '2XBNATYPcdqKk7KAoHDmLEAreM1G64eQKWUysio9Z1M',
    playerUrl: 'https://player.mux.com/2XBNATYPcdqKk7KAoHDmLEAreM1G64eQKWUysio9Z1M?metadata-video-title=video1634486089&video-title=video1634486089',
    iframeTitle: 'video1634486089',
  },
  'video buoi 4': {
    playbackId: 'eEY00T47o1MYsJ9Qh2tqSKTDaR8pzEgv6bcsSYgWlBVg',
    playerUrl: 'https://player.mux.com/eEY00T47o1MYsJ9Qh2tqSKTDaR8pzEgv6bcsSYgWlBVg?metadata-video-title=video1558523669&video-title=video1558523669',
    iframeTitle: 'video1558523669',
  },
  'video buoi 5': {
    playbackId: '7kVVqLtA1IvRm3006EGQmhSsO8UY1QX3nOfiU4SHNi6E',
    playerUrl: 'https://player.mux.com/7kVVqLtA1IvRm3006EGQmhSsO8UY1QX3nOfiU4SHNi6E?metadata-video-title=video1882740513&video-title=video1882740513',
    iframeTitle: 'video1882740513',
  },
  'video buoi 6': {
    playbackId: 'QP1WlkGeYqfT2600o9czEje8QUnnVsqcUsEIOCT0101wEI',
    playerUrl: 'https://player.mux.com/QP1WlkGeYqfT2600o9czEje8QUnnVsqcUsEIOCT0101wEI?metadata-video-title=video1276259655&video-title=video1276259655',
    iframeTitle: 'video1276259655',
  },
};

const TITLE_ALIASES: Readonly<Record<string, string>> = {
  'buoi 1 - sang 15.08.2026': 'video buoi 1',
  'buoi 2 - chieu 15.08.2026': 'video buoi 2',
  'buoi 3 - sang 16.08.2026': 'video buoi 3',
  'buoi 4 - chieu 16.08.2026': 'video buoi 4',
  'buoi 5 - sang 17.08.2026': 'video buoi 5',
  'buoi 6 - chieu 17.08.2026': 'video buoi 6',
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
  const normalizedTitle = normalizeTitle(title);
  const playback = PLAYBACKS[TITLE_ALIASES[normalizedTitle] ?? normalizedTitle];
  return playback ? { ...playback } : null;
}
