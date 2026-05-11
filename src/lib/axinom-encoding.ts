const AXINOM_AUTH_URL = 'https://id.service.eu.axinom.net/connect/token';
const AXINOM_API_URL = process.env.AXINOM_ENCODING_API_URL || 'https://vip-eu-west-1.axinom.com/api/encoding';
const CLIENT_ID = process.env.AXINOM_ENCODING_CLIENT_ID;
const CLIENT_SECRET = process.env.AXINOM_ENCODING_CLIENT_SECRET;

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAuthToken(): Promise<string> {
    // Return cached token if still valid
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
        return cachedToken.token;
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
        throw new Error('Axinom credentials not configured');
    }

    const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'https://axinom.com/mosaic/service'
    });

    const response = await fetch(AXINOM_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });

    if (!response.ok) {
        throw new Error(`Auth failed: ${await response.text()}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };

    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 300) * 1000, // Refresh 5 min early
    };

    return cachedToken.token;
}

interface EncodingJobOptions {
    videoId: string;
    inputBlobName: string;
    drmKeyId: string;
    drmKey: string;
}

export async function createEncodingJob(options: EncodingJobOptions): Promise<string> {
    const token = await getAuthToken();
    const { videoId, inputBlobName, drmKeyId, drmKey } = options;

    const accountName = process.env.AZURE_STORAGE_ACCOUNT;
    const accountKey = process.env.AZURE_STORAGE_KEY;
    const inputContainer = process.env.AZURE_VIDEO_INPUT_CONTAINER || 'video-input';
    const outputContainer = process.env.AZURE_VIDEO_OUTPUT_CONTAINER || 'video-output';

    // Construct the encoding job JSON
    const job = {
        name: `Video ${videoId}`,
        acquisition: {
            azure: {
                account: accountName,
                encrypted_key: accountKey, // Should be encrypted with Axinom's cert
                container: inputContainer,
                path: inputBlobName,
            },
        },
        publishing: {
            azure: {
                account: accountName,
                encrypted_key: accountKey,
                container: outputContainer,
                path: videoId, // Output folder
            },
        },
        processing: {
            video_stream_selection: 'all',
            audio_stream_selection: 'all',
            drm: {
                encryption_mode: 'cenc',
                content_key: drmKey,
                key_id: drmKeyId,
            },
        },
    };

    const response = await fetch(`${AXINOM_API_URL}/jobs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(job),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Encoding job creation failed: ${errorText}`);
    }

    const result = await response.json() as { id: string };
    return result.id; // Return job ID
}

export async function getJobStatus(jobId: string): Promise<{ status: string; dashUrl?: string; hlsUrl?: string }> {
    const token = await getAuthToken();

    const response = await fetch(`${AXINOM_API_URL}/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
        throw new Error(`Failed to get job status: ${await response.text()}`);
    }

    interface JobStatusResponse {
        status?: string;
        dash_url?: string;
        hls_url?: string;
    }

    const data = await response.json() as JobStatusResponse;

    return {
        status: data.status || 'UNKNOWN',
        dashUrl: data.dash_url,
        hlsUrl: data.hls_url,
    };
}
