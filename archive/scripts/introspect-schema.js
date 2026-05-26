// const fetch = require('node-fetch'); // Native fetch in Node 18+

const VIDEO_SERVICE_URL = 'https://video.service.eu.axinom.net/graphql';

async function introspect() {
    const query = `
        query IntrospectionQuery {
            __type(name: "Video") {
                name
                fields {
                    name
                    type {
                        name
                        kind
                        ofType {
                            name
                            kind
                        }
                    }
                }
            }
        }
    `;

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

    console.log('Introspecting Video Type...');
    const res = await fetch(VIDEO_SERVICE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
    });

    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

introspect().catch(console.error);
