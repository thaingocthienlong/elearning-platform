import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { readDoveRunnerUploadConfig } from './doverunner-env';

export function buildS3SourceKey({
  videoId,
  filename,
}: {
  videoId: string;
  filename: string;
}) {
  const extensionMatch = filename.match(/\.([A-Za-z0-9]+)$/);
  const extension = extensionMatch?.[1]?.toLowerCase() || 'mp4';
  return `videos/${videoId}/source.${extension}`;
}

function createS3Client() {
  const config = readDoveRunnerUploadConfig();

  return new S3Client({
    region: config.awsRegion,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
  });
}

export async function createS3UploadUrl({
  videoId,
  filename,
  contentType,
  expiresInSeconds = 3600,
}: {
  videoId: string;
  filename: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  const config = readDoveRunnerUploadConfig();
  const sourceKey = buildS3SourceKey({ videoId, filename });
  const client = createS3Client();

  const command = new PutObjectCommand({
    Bucket: config.awsInputBucket,
    Key: sourceKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
  });

  return {
    uploadUrl,
    sourceKey,
    sourceBucket: config.awsInputBucket,
  };
}
