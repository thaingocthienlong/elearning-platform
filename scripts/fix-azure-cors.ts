
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import d from 'dotenv';
import path from 'path';

// Load local env files without printing secret values.
d.config({ path: path.resolve(process.cwd(), '.env') });
d.config({ path: path.resolve(process.cwd(), '.env.local'), override: false });

async function fixCors() {
    console.log("========================================");
    console.log("🌊 Fixing Azure CORS Rules");
    console.log("========================================");

    const account = process.env.AZURE_STORAGE_ACCOUNT;
    const accountKey = process.env.AZURE_STORAGE_KEY;

    if (!account || !accountKey) {
        console.error("❌ Missing Azure Credentials in .env (AZURE_STORAGE_ACCOUNT / AZURE_STORAGE_KEY)");
        process.exit(1);
    }

    try {
        const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
        const blobServiceClient = new BlobServiceClient(
            `https://${account}.blob.core.windows.net`,
            sharedKeyCredential
        );

        console.log("   Account: [configured]");

        // Allowed Origins must be a comma-separated string
        const allowedOrigins = [
            "https://vienphuongnam.vercel.app",
            "http://localhost:3000",
            "http://localhost:3001",
            "https://www.vienphuongnam.vercel.app",
            "https://elearning.vienphuongnam.com.vn",
            "https://www.elearning.vienphuongnam.com.vn"
        ].join(",");

        const corsRule = {
            allowedOrigins: allowedOrigins,
            allowedMethods: "GET,POST,PUT,OPTIONS,HEAD",
            allowedHeaders: "content-type,x-ms-blob-type,x-ms-blob-content-type,x-ms-version,x-ms-date,x-ms-client-request-id",
            exposedHeaders: "etag,last-modified,x-ms-request-id,x-ms-version,x-ms-request-server-encrypted",
            maxAgeInSeconds: 86400 // 24 hours
        };

        console.log("\n1. 📡 Setting Service Properties...");
        console.log("   New CORS Rule:", JSON.stringify(corsRule, null, 2));

        // Use standard @azure/storage-blob method to set properties
        await blobServiceClient.setProperties({
            cors: [corsRule]
        });

        console.log("\n   ✅ CORS rules successfully updated!");
        console.log("   ⚠️ Note: It may take up to 60 seconds for changes to propagate globally.");

        // Verification step
        console.log("\n2. 🔍 Verifying current properties...");
        const props = await blobServiceClient.getProperties();
        console.log("   Current Rules on Server:");
        if (props.cors && props.cors.length > 0) {
            props.cors.forEach((rule, i) => {
                console.log(`   [Rule ${i + 1}] Origins: ${rule.allowedOrigins}`);
                console.log(`            Methods: ${rule.allowedMethods}`);
                console.log(`            Headers: ${rule.allowedHeaders}`);
            });
        } else {
            console.log("   ⚠️ No CORS rules found (Unexpected!)");
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("\n❌ Failed to update CORS:");
        console.error(`   ${message}`);
        process.exit(1);
    }
}

fixCors();
