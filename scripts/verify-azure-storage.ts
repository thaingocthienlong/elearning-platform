
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import d from 'dotenv';
import path from 'path';

// Load .env
d.config({ path: path.resolve(process.cwd(), '.env') });

async function verifyAzure() {
    console.log("========================================");
    console.log("☁️  Verifying Azure Storage Connection");
    console.log("========================================");

    const account = process.env.AX_BLOB_ACCOUNT;
    const accountKey = process.env.AX_STORAGE_ACCOUNT_KEY;
    const containerName = process.env.AX_INPUT_CONTAINER || "video-input";

    if (!account || !accountKey) {
        console.error("❌ Missing Azure Credentials in .env (AX_BLOB_ACCOUNT or AX_STORAGE_ACCOUNT_KEY)");
        process.exit(1);
    }

    console.log(`   Account: ${account}`);
    console.log(`   Container: ${containerName}`);

    try {
        const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
        const blobServiceClient = new BlobServiceClient(
            `https://${account}.blob.core.windows.net`,
            sharedKeyCredential
        );

        // 1. List Containers (Checks Auth + Read Access)
        console.log("\n1. 📂 Listing Containers...");
        let found = false;
        for await (const container of blobServiceClient.listContainers()) {
            console.log(`   - Found: ${container.name}`);
            if (container.name === containerName) found = true;
        }

        if (!found) {
            console.warn(`   ⚠️  Target container '${containerName}' not found in list.`);
        } else {
            console.log(`   ✅ Target container '${containerName}' exists.`);
        }

        // 2. Test Write Access (Checks Subscription Status)
        console.log("\n2. ✍️  Testing Write Access (Upload dummy file)...");
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Ensure container exists (try to create if missing, though typically fails if disabled)
        await containerClient.createIfNotExists();

        const blockBlobClient = containerClient.getBlockBlobClient("test-connectivity.txt");
        const content = "Azure Subscription Verification - " + new Date().toISOString();

        await blockBlobClient.upload(content, content.length);
        console.log("   ✅ Upload successful! Write access confirmed.");

        // Clean up
        await blockBlobClient.delete();
        console.log("   ✅ Test file cleaned up.");

        console.log("\n🎉 Azure Storage is ACTIVE and WRITABLE.");

    } catch (error: any) {
        console.error("\n❌ Azure Connection Failed:");
        console.error(`   ${error.message}`);

        if (error.code === 'AccountIsDisabled') {
            console.error("\n   🛑 DIAGNOSIS: The Azure Subscription is DISABLED. You must reactivate it or switch accounts.");
        } else if (error.code === 'AuthenticationFailed') {
            console.error("\n   🛑 DIAGNOSIS: Invalid Storage Key or Account Name.");
        }
        process.exit(1);
    }
}

verifyAzure();
