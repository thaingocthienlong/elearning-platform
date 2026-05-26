import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'node:path';
import { readDoveRunnerConfig } from '../src/lib/media-provider/doverunner-env';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

type TnpResponse<T> = {
  error_code?: string;
  error_message?: string;
  data?: T;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function printHeader() {
  console.log('========================================');
  console.log('Verifying DoveRunner T&P Configuration');
  console.log('========================================');
}

async function getTnpToken() {
  const config = readDoveRunnerConfig();
  const basic = Buffer.from(`${config.tnpAccountId}:${config.tnpAccessKey}`, 'utf8').toString('base64');
  const response = await fetch(`${config.tnpApiBaseUrl}/api/token/${config.siteId}`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${basic}`,
    },
  });
  const body = await response.json() as TnpResponse<{ token: string }>;

  if (!response.ok || body.error_code !== '0000' || !body.data?.token) {
    throw new Error(`T&P token API failed: ${body.error_code || response.status}`);
  }

  return body.data.token;
}

async function verifyTnpSetting() {
  const config = readDoveRunnerConfig();
  const token = await getTnpToken();
  const response = await fetch(`${config.tnpApiBaseUrl}/api/setting/${config.siteId}`, {
    method: 'GET',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json;charset=UTF-8',
    },
  });
  const body = await response.json() as TnpResponse<{
    region?: string;
    service_status?: string;
  }>;

  if (!response.ok || body.error_code !== '0000') {
    throw new Error(`T&P setting API failed: ${body.error_code || response.status}`);
  }

  console.log(`OK DoveRunner T&P setting reachable (${body.data?.service_status ?? 'unknown status'})`);
}

async function verifyS3Buckets() {
  const config = readDoveRunnerConfig();
  const client = new S3Client({
    region: config.awsRegion,
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
  });

  await client.send(new HeadBucketCommand({ Bucket: config.awsInputBucket }));
  console.log('OK AWS S3 input bucket reachable');

  await client.send(new HeadBucketCommand({ Bucket: config.awsOutputBucket }));
  console.log('OK AWS S3 output bucket reachable');
}

async function verify() {
  const live = process.argv.includes('--live');

  printHeader();

  try {
    const config = readDoveRunnerConfig();
    console.log(`OK DoveRunner env validation passed for site ${config.siteId}`);
    console.log(`OK AWS S3 config present for region ${config.awsRegion}`);
  } catch (error) {
    console.error(`FAIL ${errorMessage(error)}`);
    process.exit(1);
  }

  if (!live) {
    console.log('SKIP live DoveRunner T&P and AWS S3 checks. Re-run with --live after real credentials are configured.');
    return;
  }

  try {
    await verifyTnpSetting();
    await verifyS3Buckets();
  } catch (error) {
    console.error(`FAIL live DoveRunner verification: ${errorMessage(error)}`);
    process.exit(1);
  }
}

void verify();
