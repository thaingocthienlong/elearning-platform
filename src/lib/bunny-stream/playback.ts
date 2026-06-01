import { generateBunnyEmbedToken } from '@/lib/bunny-stream/signing';

export type BunnyStreamPlayback = {
  libraryId: string;
  bunnyVideoId: string;
};

export type BunnyStreamSignedPlayback = BunnyStreamPlayback & {
  signedEmbedUrl: string;
  expires: number;
};

type CreateBunnyStreamSignedPlaybackInput = {
  libraryId: string;
  bunnyVideoId: string;
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

export function createBunnyStreamSignedPlayback({
  libraryId,
  bunnyVideoId,
  tokenSecurityKey,
  embedTokenTtlSeconds,
  now = new Date(),
}: CreateBunnyStreamSignedPlaybackInput): BunnyStreamSignedPlayback {
  const safeLibraryId = readRequiredSegment(libraryId, 'libraryId');
  const safeBunnyVideoId = readRequiredSegment(bunnyVideoId, 'bunnyVideoId');
  const ttlSeconds = readPositiveInteger(
    embedTokenTtlSeconds,
    'embedTokenTtlSeconds'
  );

  const expires = Math.floor(now.getTime() / 1000) + ttlSeconds;
  const token = generateBunnyEmbedToken({
    tokenSecurityKey,
    videoId: safeBunnyVideoId,
    expires,
  });
  const embedUrl = [
    'https://player.mediadelivery.net/embed',
    encodeURIComponent(safeLibraryId),
    encodeURIComponent(safeBunnyVideoId),
  ].join('/');

  return {
    signedEmbedUrl: `${embedUrl}?token=${token}&expires=${expires}&autoplay=false&preload=true&responsive=true`,
    libraryId: safeLibraryId,
    bunnyVideoId: safeBunnyVideoId,
    expires,
  };
}
