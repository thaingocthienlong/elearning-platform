import 'dotenv/config';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

async function configureCORS() {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT!;
    const accountKey = process.env.AZURE_STORAGE_KEY!;

    console.log(`Configuring CORS for Azure Storage: ${accountName}...`);

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        sharedKeyCredential
    );

    const corsRules = [
        {
            allowedOrigins: '*', // For development. Restrict in production.
            allowedMethods: 'GET,HEAD,PUT,POST',
            allowedHeaders: '*',
            exposedHeaders: '*',
            maxAgeInSeconds: 3600,
        },
    ];

    try {
        await blobServiceClient.setProperties({
            cors: corsRules,
        });
        console.log('✅ Successfully configured CORS for Azure Blob Storage!');
    } catch (error) {
        console.error('❌ Error configuring CORS:', error);
    }
}

configureCORS();
