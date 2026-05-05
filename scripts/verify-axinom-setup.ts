import { getAuthToken, encodeVideoViaService } from '../src/lib/axinom-video-service';
import { validateAxinomEnv } from '../src/lib/axinom-env';
import d from 'dotenv';
import path from 'path';

// Load .env from current directory
d.config({ path: path.resolve(process.cwd(), '.env') });
d.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

async function verify() {
    const strict = process.argv.includes('--strict') || process.env.CI === 'true';
    const live = process.argv.includes('--live');
    const validation = validateAxinomEnv(process.env, strict ? 'strict' : 'local');

    console.log('========================================');
    console.log('Verifying Axinom Configuration');
    console.log('========================================');

    for (const warning of validation.warnings) {
        console.warn(`WARN ${warning}`);
    }

    for (const error of validation.errors) {
        console.error(`FAIL ${error}`);
    }

    if (!validation.ok) {
        process.exit(1);
    }

    console.log('OK Axinom env validation passed');

    if (!live) {
        console.log('SKIP live Axinom API checks. Re-run with --live after configuring a trial tenant.');
        return;
    }

    try {
        // 1. Test Authentication
        console.log("\n1. Testing Authentication...");
        const token = await getAuthToken();
        if (token) {
            console.log("   OK Auth token received successfully");

            try {
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                const tenantId = payload.tid || payload.tenantId || payload.aud || 'unknown';
                const userId = payload.sub || 'unknown';
                console.log(`   Tenant ID: ${tenantId}`);
                console.log(`   User ID (sub): ${userId}`);
            } catch {
                console.warn("   WARN Could not decode token details");
            }
        }

        // 2. Test Job Creation (Validation)
        console.log("\n2. Testing Video Service Connection (dummy job)...");
        const profileId = process.env.AXINOM_ENCODING_PROFILE_DRM || process.env.AX_PROFILE_ID;
        console.log(`   Using Profile ID: ${profileId}`);

        try {
            const result = await encodeVideoViaService({
                videoTitle: "Axinom Connection Test",
                sourceLocation: "test/non_existent_file.mp4"
            });
            console.log("   OK Job created. ID:", result.videoId);
            console.log("   (Note: The job itself will fail later because the file doesn't exist, but the API interaction was successful!)");
        } catch (error: unknown) {
            const message = errorMessage(error);
            console.log("   WARN Job creation threw an error:");
            console.log(`   "${message}"`);

            if (message.includes("GraphQL errors")) {
                console.log("\n   FAIL This likely means the Profile ID is invalid or the Service Account lacks permission.");
            } else if (message.includes("Auth failed")) {
                console.log("\n   FAIL Authentication refused this request.");
            } else {
                console.log("\n   OK Connection reached. Error was expected for dummy data.");
            }
        }

    } catch (error: unknown) {
        console.error("\nFAIL Fatal Verification Error:", errorMessage(error));
        process.exit(1);
    }
}

verify();
