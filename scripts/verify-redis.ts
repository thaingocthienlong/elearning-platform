import process from 'node:process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';
import { getRedisClient, getRedisConfigError } from '../src/lib/redis';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

async function main() {
  const configError = getRedisConfigError();
  if (configError) {
    throw new Error(configError);
  }

  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Redis client unavailable');
  }

  const smokeKey = `verify:redis:${randomUUID()}`;
  const smokeValue = {
    ok: true,
    source: 'secure-streaming-platform',
  };

  await redis.set(smokeKey, smokeValue, { ex: 60 });
  const readBack = await redis.get<typeof smokeValue>(smokeKey);
  await redis.del(smokeKey);

  if (!readBack?.ok || readBack.source !== smokeValue.source) {
    throw new Error('Redis smoke value did not round-trip');
  }

  const systemMode = await redis.get<string>('config:system_mode');
  if (systemMode && systemMode !== 'courses' && systemMode !== 'meeting') {
    throw new Error('config:system_mode must be courses or meeting when set');
  }

  console.log('OK Redis live smoke passed');
  console.log(`OK system mode key ${systemMode ? 'present' : 'not set; default courses applies'}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Redis verification failed';
  console.error(`FAIL verify:redis: ${message}`);
  process.exit(1);
});
