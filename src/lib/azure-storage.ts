import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';

const accountName = process.env.AZURE_STORAGE_ACCOUNT || '';
const accountKey = process.env.AZURE_STORAGE_KEY || '';
const inputContainer = process.env.AZURE_VIDEO_INPUT_CONTAINER || 'video-input';
const outputContainer = process.env.AZURE_VIDEO_OUTPUT_CONTAINER || 'video-output';

function getAzureClients() {
    if (!accountName || !accountKey) {
        throw new Error('Azure Storage is not configured. Set AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_KEY.');
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        sharedKeyCredential
    );

    return { blobServiceClient, sharedKeyCredential };
}

export const azureStorage = {
    inputContainer,
    outputContainer,
    accountName,

    async getUploadSasUrl(fileName: string, expiresInMinutes: number = 60): Promise<{ url: string; blobName: string }> {
        const { blobServiceClient, sharedKeyCredential } = getAzureClients();
        const containerClient = blobServiceClient.getContainerClient(inputContainer);
        const videoId = `${Date.now()}`;
        const blobName = `${videoId}/source${fileName.substring(fileName.lastIndexOf('.'))}`;
        const blobClient = containerClient.getBlobClient(blobName);

        const sasOptions = {
            containerName: inputContainer,
            blobName: blobName,
            permissions: BlobSASPermissions.parse('cw'), // Create + Write permissions
            startsOn: new Date(),
            expiresOn: new Date(new Date().valueOf() + expiresInMinutes * 60 * 1000),
        };

        const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
        const url = `${blobClient.url}?${sasToken}`;

        return { url, blobName: videoId }; // Return folder name as blobName
    },

    getOutputUrl(path: string): string {
        return `https://${accountName}.blob.core.windows.net/${outputContainer}/${path}`;
    }
};
