import 'server-only';

const VDOCIPHER_API_BASE = 'https://dev.vdocipher.com/api';

export type VdoCipherUploadResponse = {
  videoId: string;
  clientPayload: Record<string, unknown>;
};

export type VdoCipherStatusResponse = {
  id?: string;
  status?: string;
  poster?: string;
  title?: string;
};

export type VdoCipherOtpResponse = {
  otp: string;
  playbackInfo: string;
};

async function parseVdoCipherResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof body?.message === 'string'
        ? body.message
        : `VdoCipher API failed with ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

function authHeaders(apiSecret: string) {
  return {
    Accept: 'application/json',
    Authorization: `Apisecret ${apiSecret}`,
    'Content-Type': 'application/json',
  };
}

export async function createVdoCipherUpload(options: {
  apiSecret: string;
  title: string;
}): Promise<VdoCipherUploadResponse> {
  const response = await fetch(`${VDOCIPHER_API_BASE}/videos`, {
    method: 'PUT',
    headers: authHeaders(options.apiSecret),
    body: JSON.stringify({ title: options.title }),
  });

  return parseVdoCipherResponse<VdoCipherUploadResponse>(response);
}

export async function getVdoCipherVideoStatus(options: {
  apiSecret: string;
  vdoCipherVideoId: string;
}): Promise<VdoCipherStatusResponse> {
  const response = await fetch(`${VDOCIPHER_API_BASE}/videos/${options.vdoCipherVideoId}`, {
    method: 'GET',
    headers: authHeaders(options.apiSecret),
  });

  return parseVdoCipherResponse<VdoCipherStatusResponse>(response);
}

export async function getVdoCipherOtp(options: {
  apiSecret: string;
  vdoCipherVideoId: string;
  ttl: number;
  annotate: string;
}): Promise<VdoCipherOtpResponse> {
  const response = await fetch(`${VDOCIPHER_API_BASE}/videos/${options.vdoCipherVideoId}/otp`, {
    method: 'POST',
    headers: authHeaders(options.apiSecret),
    body: JSON.stringify({
      ttl: options.ttl,
      annotate: options.annotate,
    }),
  });

  return parseVdoCipherResponse<VdoCipherOtpResponse>(response);
}
