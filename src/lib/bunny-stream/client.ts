export type BunnyStreamVideo = {
  guid: string;
  title?: string;
  status?: number;
  encodeProgress?: number;
  availableResolutions?: string;
  thumbnailFileName?: string;
  length?: number;
};

export class BunnyStreamApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'BunnyStreamApiError';
  }
}

function bunnyUrl(path: string) {
  return `https://video.bunnycdn.com${path}`;
}

async function fetchOrThrow(input: string, init: RequestInit) {
  try {
    return await fetch(input, init);
  } catch {
    throw new BunnyStreamApiError('Bunny Stream API transport failed', 502);
  }
}

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new BunnyStreamApiError(
      `Bunny Stream API failed with HTTP ${response.status}`,
      response.status
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new BunnyStreamApiError(
      'Bunny Stream API returned invalid JSON',
      502
    );
  }
}

function validateCreateVideoResponse(value: unknown): BunnyStreamVideo {
  if (!value || typeof value !== 'object' || !('guid' in value)) {
    throw new BunnyStreamApiError(
      'Bunny Stream API returned invalid video data',
      502
    );
  }

  const guid = value.guid;
  if (typeof guid !== 'string' || !guid.trim()) {
    throw new BunnyStreamApiError(
      'Bunny Stream API returned invalid video data',
      502
    );
  }

  return { ...value, guid: guid.trim() } as BunnyStreamVideo;
}

export async function createBunnyStreamVideo({
  libraryId,
  apiKey,
  title,
  collectionId,
}: {
  libraryId: string;
  apiKey: string;
  title: string;
  collectionId?: string | null;
}) {
  const body: { title: string; collectionId?: string } = { title };
  if (collectionId) body.collectionId = collectionId;

  const response = await fetchOrThrow(bunnyUrl(`/library/${libraryId}/videos`), {
    method: 'POST',
    headers: {
      AccessKey: apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return validateCreateVideoResponse(await readJsonOrThrow<unknown>(response));
}

export async function getBunnyStreamVideo({
  libraryId,
  apiKey,
  videoId,
}: {
  libraryId: string;
  apiKey: string;
  videoId: string;
}) {
  const response = await fetchOrThrow(
    bunnyUrl(`/library/${libraryId}/videos/${videoId}`),
    {
      method: 'GET',
      headers: {
        AccessKey: apiKey,
        Accept: 'application/json',
      },
    }
  );

  return readJsonOrThrow<BunnyStreamVideo>(response);
}

export async function deleteBunnyStreamVideo({
  libraryId,
  apiKey,
  videoId,
}: {
  libraryId: string;
  apiKey: string;
  videoId: string;
}): Promise<void> {
  const response = await fetchOrThrow(
    bunnyUrl(`/library/${libraryId}/videos/${videoId}`),
    {
      method: 'DELETE',
      headers: {
        AccessKey: apiKey,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new BunnyStreamApiError(
      `Bunny Stream API failed with HTTP ${response.status}`,
      response.status
    );
  }
}
