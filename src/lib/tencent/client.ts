import { loadTencentEnv } from './env';
import { createTencentSignedHeaders } from './signing';

const ENDPOINT = 'https://vod.tencentcloudapi.com';
const VERSION = '2018-07-17';

export type TencentApiResponse<T> = {
  Response: T & {
    RequestId: string;
    Error?: {
      Code: string;
      Message: string;
    };
  };
};

export async function callTencentVod<T>(action: string, body: Record<string, unknown>): Promise<T & { RequestId: string }> {
  const env = loadTencentEnv();
  const payload = JSON.stringify(env.subAppId ? { ...body, SubAppId: env.subAppId } : body);
  const timestamp = Math.floor(Date.now() / 1000);

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: createTencentSignedHeaders({
      action,
      payload,
      region: env.region,
      secretId: env.secretId,
      secretKey: env.secretKey,
      service: 'vod',
      timestamp,
      version: VERSION,
    }),
    body: payload,
  });

  const data = (await response.json()) as TencentApiResponse<T>;
  if (!response.ok || data.Response.Error) {
    const code = data.Response.Error?.Code ?? `HTTP_${response.status}`;
    const message = data.Response.Error?.Message ?? 'Tencent VOD request failed';
    throw new Error(`${action} failed: ${code}: ${message}`);
  }

  return data.Response;
}
