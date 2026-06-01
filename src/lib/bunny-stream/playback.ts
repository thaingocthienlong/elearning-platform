import { generateBunnyEmbedToken } from '@/lib/bunny-stream/signing';

export type BunnyStreamPlayback = {
  embedUrl: string;
  libraryId: string;
  videoId: string;
  token: string;
  expires: number;
  autoplay: false;
  preload: true;
  responsive: true;
};

type CreateBunnyStreamPlaybackInput = {
  libraryId: string;
  videoId: string;
  tokenSecurityKey: string;
  embedTokenTtlSeconds: number;
  now?: Date;
};

function readRequiredSegment(value: string, name: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${name} is required for Bunny Stream playback.`);
  }

  return trimmed;
}

function readPositiveInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

export function createBunnyStreamPlayback({
  libraryId,
  videoId,
  tokenSecurityKey,
  embedTokenTtlSeconds,
  now = new Date(),
}: CreateBunnyStreamPlaybackInput): BunnyStreamPlayback {
  const safeLibraryId = readRequiredSegment(libraryId, 'libraryId');
  const safeVideoId = readRequiredSegment(videoId, 'videoId');
  const ttlSeconds = readPositiveInteger(
    embedTokenTtlSeconds,
    'embedTokenTtlSeconds'
  );

  const expires = Math.floor(now.getTime() / 1000) + ttlSeconds;
  const token = generateBunnyEmbedToken({
    tokenSecurityKey,
    videoId: safeVideoId,
    expires,
  });
  const embedUrl = [
    'https://player.mediadelivery.net/embed',
    encodeURIComponent(safeLibraryId),
    encodeURIComponent(safeVideoId),
  ].join('/');

  return {
    embedUrl: `${embedUrl}?token=${token}&expires=${expires}&autoplay=false&preload=true&responsive=true`,
    libraryId: safeLibraryId,
    videoId: safeVideoId,
    token,
    expires,
    autoplay: false,
    preload: true,
    responsive: true,
  };
}
