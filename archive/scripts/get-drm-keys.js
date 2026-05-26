// Query Axinom to get the DRM key IDs for the video

const VIDEO_SERVICE_URL = 'https://video.service.eu.axinom.net/graphql';
const JOB_ID = '111d1323-68bd-451d-9c93-ce2cb6dce07f';

async function getDrmKeys() {
    const CLIENT_ID = '6d03d30f-9d5d-4ebb-bc58-ffc4ed47bf54';
    const CLIENT_SECRET = 'HM4K9iIF9pOfrg6OwckBgpUd';
    const IDENTITY_URL = 'https://id.service.eu.axinom.net/graphql';

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

    // Query video streams to get key IDs
    const query = `
        query VideoQuery($id: UUID!) {
            video(id: $id) {
                id
                title
                videoStreams {
                    nodes {
                        label
                        keyId
                        iv
                        format
                    }
                }
            }
        }
    `;

    const res = await fetch(VIDEO_SERVICE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            query,
            variables: { id: JOB_ID }
        })
    });

    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

getDrmKeys().catch(console.error);
