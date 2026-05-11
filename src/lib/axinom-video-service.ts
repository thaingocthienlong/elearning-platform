
const AXINOM_IDENTITY_URL = 'https://id.service.eu.axinom.net/graphql';
const VIDEO_SERVICE_URL = process.env.AXINOM_VIDEO_SERVICE_URL || 'https://video.service.eu.axinom.net/graphql';
// CLIENT_ID and SECRET are read dynamically to allow dotenv preloading
// const CLIENT_ID = process.env.AXINOM_ENCODING_CLIENT_ID || process.env.AX_CLIENT_ID;
// const CLIENT_SECRET = process.env.AXINOM_ENCODING_CLIENT_SECRET || process.env.AX_CLIENT_SECRET;

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAuthToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
        return cachedToken.token;
    }

    const clientId = process.env.AXINOM_ENCODING_CLIENT_ID || process.env.AX_CLIENT_ID;
    const clientSecret = process.env.AXINOM_ENCODING_CLIENT_SECRET || process.env.AX_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Axinom credentials not configured');
    }

    const query = `
        mutation Authenticate($clientId: String!, $clientSecret: String!) {
            authenticateServiceAccount(input: { clientId: $clientId, clientSecret: $clientSecret }) {
                accessToken
            }
        }
    `;

    const response = await fetch(AXINOM_IDENTITY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query,
            variables: { clientId: clientId, clientSecret: clientSecret }
        }),
    });

    if (!response.ok) {
        throw new Error(`Auth failed: ${await response.text()}`);
    }

    interface AuthResponse {
        data: {
            authenticateServiceAccount: {
                accessToken: string;
            }
        };
        errors?: unknown[];
    }

    const result = await response.json() as AuthResponse;

    if (result.errors) {
        throw new Error(`Auth errors: ${JSON.stringify(result.errors)}`);
    }

    const data = result.data.authenticateServiceAccount;

    cachedToken = {
        token: data.accessToken,
        expiresAt: Date.now() + (3600 - 300) * 1000,
    };

    return cachedToken.token;
}

interface EncodeVideoOptions {
    videoTitle: string;
    sourceLocation: string;
    profileId?: string; // Optional: use specific profile, otherwise use default DRM profile
}

export async function encodeVideoViaService(options: EncodeVideoOptions): Promise<{ videoId: string; axinomVideoId: string }> {
    const token = await getAuthToken();
    const { videoTitle, sourceLocation, profileId } = options;

    // Use provided profileId or fallback to default DRM profile from env
    const rawProfileId = profileId || process.env.AXINOM_ENCODING_PROFILE_DRM || process.env.AX_PROFILE_ID;
    const processingProfileId = rawProfileId?.trim();

    if (!processingProfileId) {
        throw new Error('No Encoding Profile ID provided (and none in env)');
    }

    // Debug: Decode Tenant ID from Token
    let tenantId = 'unknown';
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        tenantId = payload.tid || payload.tenantId || payload.aud || 'unknown';
    } catch (e) {
        console.warn('Failed to decode token for debug', e);
    }

    const query = `
        mutation EncodeVideo($input: EncodeVideoInput!) {
            encodeVideo(input: $input) {
                video {
                    id
                    title
                }
            }
        }
    `;

    const response = await fetch(VIDEO_SERVICE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            query,
            variables: {
                input: {
                    videoRelativePath: sourceLocation,
                    processingProfileId: processingProfileId
                }
            }
        }),
    });

    if (!response.ok) {
        throw new Error(`Video Service failed: ${await response.text()}`);
    }

    interface VideoResponse {
        data: {
            encodeVideo: {
                video: {
                    id: string;
                    title: string;
                }
            }
        };
        errors?: unknown[];
    }

    const result = await response.json() as VideoResponse;

    if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)} (Profile: ${processingProfileId}, Tenant: ${tenantId}, Service: ${VIDEO_SERVICE_URL})`);
    }

    const axinomVideoId = result.data.encodeVideo.video.id;

    return {
        videoId: axinomVideoId,
        axinomVideoId: axinomVideoId
    };
}
