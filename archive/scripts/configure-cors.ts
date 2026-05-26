import 'dotenv/config';
import { PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { r2, R2_BUCKET } from '@/lib/r2';

async function main() {
    console.log(`Configuring CORS for bucket: ${R2_BUCKET}...`);

    const command = new PutBucketCorsCommand({
        Bucket: R2_BUCKET,
        CORSConfiguration: {
            CORSRules: [
                {
                    AllowedHeaders: ['*'],
                    AllowedMethods: ['PUT', 'POST', 'GET', 'HEAD'],
                    AllowedOrigins: ['*'], // For development. In prod, restrict to domain.
                    ExposeHeaders: ['ETag'],
                    MaxAgeSeconds: 3000,
                },
            ],
        },
    });

    try {
        await r2.send(command);
        console.log('Successfully configured CORS!');
    } catch (error) {
        console.error('Error configuring CORS:', error);
    }
}

main();
