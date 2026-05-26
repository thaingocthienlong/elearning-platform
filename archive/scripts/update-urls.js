// const fetch = require('node-fetch'); // Native fetch in Node 18+

async function tryUpdate(port) {
    const url = `http://127.0.0.1:${port}/api/video/update-urls`;
    console.log(`Trying ${url}...`);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                axinomVideoId: '111d1323-68bd-451d-9c93-ce2cb6dce07f'
            })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
        }

        const data = await response.json();
        console.log('Success:', JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.log(`Failed on port ${port}: ${err.message}`);
        return false;
    }
}

async function main() {
    if (await tryUpdate(3000)) return;
    if (await tryUpdate(3001)) return;
    console.error('Could not connect to server on port 3000 or 3001.');
}

main().catch(console.error);
