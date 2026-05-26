// const fetch = require('node-fetch'); // Native fetch in Node 18+
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });

const VIDEO_SERVICE_URL = process.env.AXINOM_VIDEO_SERVICE_URL || 'https://video.service.eu.axinom.net/graphql';
const IDENTITY_URL = process.env.AXINOM_IDENTITY_URL || 'https://id.service.eu.axinom.net/graphql';

const CLIENT_ID = process.env.AX_CLIENT_ID || process.env.AXINOM_ENCODING_CLIENT_ID;
const CLIENT_SECRET = process.env.AX_CLIENT_SECRET || process.env.AXINOM_ENCODING_CLIENT_SECRET;

// Configuration to update
const DRM_PROFILE_ID = process.env.AX_PROFILE_ID || process.env.AXINOM_ENCODING_PROFILE_DRM;

// These might need to be added to your .env if they are specific to this update operation
const NEW_TENANT_ID = process.env.AX_KS_TENANT_ID;
const NEW_MANAGEMENT_KEY = process.env.AX_KS_MANAGEMENT_KEY;

if (!CLIENT_ID || !CLIENT_SECRET || !DRM_PROFILE_ID || !NEW_TENANT_ID || !NEW_MANAGEMENT_KEY) {
    console.error("❌ Missing required environment variables.");
    console.error("Ensure .env contains: AX_CLIENT_ID, AX_CLIENT_SECRET, AX_PROFILE_ID, AX_KS_TENANT_ID, AX_KS_MANAGEMENT_KEY");
    process.exit(1);
}

// Construct API URL based on tenant ID prefix (first 8 chars)
const TENANT_PREFIX = NEW_TENANT_ID.split('-')[0];
const NEW_API_URL = `https://${TENANT_PREFIX}.key-service-management.axprod.net/api`;

async function updateProfile() {
    console.log('Authenticating...');
    const authQuery = `
        mutation Authenticate($clientId: String!, $clientSecret: String!) {
            authenticateServiceAccount(input: { clientId: $clientId, clientSecret: $clientSecret }) {
                accessToken
            }
        }
    `;

    const authRes = await fetch(IDENTITY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: authQuery,
            variables: { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }
        })
    });

    const authData = await authRes.json();
    if (authData.errors) {
        console.error('Auth Error:', JSON.stringify(authData.errors));
        return;
    }
    const token = authData.data.authenticateServiceAccount.accessToken;
    console.log('Authenticated.');

    console.log(`Updating DRM Profile ${DRM_PROFILE_ID}...`);
    console.log(`New Tenant Key: ${NEW_TENANT_ID}`);
    console.log(`New Management Key: ${NEW_MANAGEMENT_KEY}`);
    console.log(`New API URL: ${NEW_API_URL}`);

    const updateQuery = `
        mutation UpdateProfile($input: UpdateEncodingDrmProfileInput!) {
            updateEncodingDrmProfile(input: $input) {
                encodingDrmProfile {
                    id
                    tenantKey
                    apiUrl
                }
            }
        }
    `;

    const variables = {
        input: {
            id: DRM_PROFILE_ID,
            patch: {
                tenantKey: NEW_TENANT_ID,
                managementKey: NEW_MANAGEMENT_KEY,
                apiUrl: NEW_API_URL
            }
        }
    };

    const res = await fetch(VIDEO_SERVICE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: updateQuery, variables })
    });

    const data = await res.json();
    if (data.errors) {
        console.error('Update Error:', JSON.stringify(data.errors, null, 2));
    } else {
        console.log('✅ Update Successful!');
        console.log(JSON.stringify(data.data, null, 2));
    }
}

updateProfile().catch(console.error);
