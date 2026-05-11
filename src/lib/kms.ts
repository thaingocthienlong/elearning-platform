import { KMSClient, GenerateDataKeyCommand, DecryptCommand } from '@aws-sdk/client-kms';

const kms = new KMSClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!, // Assuming same creds or use AWS_ACCESS_KEY_ID
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

const KEY_ALIAS = process.env.KMS_KEY_ALIAS!;

export async function generateContentKey() {
    const command = new GenerateDataKeyCommand({
        KeyId: KEY_ALIAS,
        KeySpec: 'AES_128',
    });

    const response = await kms.send(command);

    if (!response.CiphertextBlob || !response.Plaintext) {
        throw new Error('Failed to generate data key');
    }

    return {
        encryptedKey: Buffer.from(response.CiphertextBlob).toString('base64'),
        plaintextKey: Buffer.from(response.Plaintext).toString('hex'),
        keyId: response.KeyId, // This is the master key ID, not the content key ID. 
        // For content key ID, we usually generate a UUID.
    };
}

export async function decryptContentKey(encryptedKeyBase64: string) {
    const command = new DecryptCommand({
        CiphertextBlob: Buffer.from(encryptedKeyBase64, 'base64'),
    });

    const response = await kms.send(command);

    if (!response.Plaintext) {
        throw new Error('Failed to decrypt data key');
    }

    return Buffer.from(response.Plaintext).toString('hex');
}
