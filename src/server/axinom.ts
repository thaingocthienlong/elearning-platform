// src/server/axinom.ts
import 'dotenv/config';

type Kids = Partial<Record<'AUDIO'|'SD'|'HD'|'UHD', string>>;

function need(name: string, v?: string) {
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const ID_AUTH = need('AX_ID_AUTH', process.env.AX_ID_AUTH);
const CLIENT_ID = need('AX_CLIENT_ID', process.env.AX_CLIENT_ID);
const CLIENT_SECRET = need('AX_CLIENT_SECRET', process.env.AX_CLIENT_SECRET);
const ENCODING_BASE = need('AX_ENCODING_BASE', process.env.AX_ENCODING_BASE);
const PROFILE_ID = need('AX_PROFILE_ID', process.env.AX_PROFILE_ID);

const BLOB_ACCOUNT = need('AX_BLOB_ACCOUNT', process.env.AX_BLOB_ACCOUNT);
const INPUT_CONTAINER = need('AX_INPUT_CONTAINER', process.env.AX_INPUT_CONTAINER);
const INPUT_ROOT = need('AX_INPUT_ROOT', process.env.AX_INPUT_ROOT);
const OUTPUT_CONTAINER = need('AX_OUTPUT_CONTAINER', process.env.AX_OUTPUT_CONTAINER);
const OUTPUT_ROOT = need('AX_OUTPUT_ROOT', process.env.AX_OUTPUT_ROOT);
const STORAGE_ACCOUNT_KEY = need('AX_STORAGE_ACCOUNT_KEY', process.env.AX_STORAGE_ACCOUNT_KEY);

const KS_BASE = process.env.AX_KS_BASE;
const KS_TENANT_ID = process.env.AX_KS_TENANT_ID;
const KS_MGMT_KEY = process.env.AX_KS_MANAGEMENT_KEY;
const VALIDATE_KIDS = /^true$/i.test(process.env.AX_VALIDATE_KIDS || 'false');

// ---- 1) Identity: get service-account JWT
export async function getServiceAccountJwt(): Promise<string> {
  const body = {
    query: `mutation Auth($id:String!,$sec:String!){
      authenticateServiceAccount(input:{clientId:$id, clientSecret:$sec}) {
        accessToken
      }
    }`,
    variables: { id: CLIENT_ID, sec: CLIENT_SECRET },
  };
  const r = await fetch(ID_AUTH, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Identity auth failed ${r.status} ${await r.text()}`);
  const j = await r.json();
  const tok = j?.data?.authenticateServiceAccount?.accessToken;
  if (!tok) throw new Error('No accessToken from Identity');
  return tok;
}

// ---- 2) Credentials Protection: encrypt storage key via Axinom public service
// Axinom provides a protection endpoint; if you use a local tool instead, replace this with that output.
export async function protectStorageSecret(plainKey: string): Promise<string> {
  // If you use Axinom's web tool, you can paste the result into env and skip this call.
  // Placeholder: pass-through if you already store encrypted string.
  // Replace with your internal encryption step if needed.
  if (/^[A-Za-z0-9+/=]{40,}$/.test(plainKey)) return plainKey; // looks like base64 -> assume already encrypted
  throw new Error('AX_STORAGE_ACCOUNT_KEY must be provided encrypted per Axinom requirement. Encrypt it using the Credentials Protection Tool and set the env to that base64 string.');
}

// ---- 3) Build Azure Blob UriPath from profile values
export function makeAzureUri(container: string, root: string, sub: string) {
  const base = `https://${BLOB_ACCOUNT}.blob.core.windows.net`;
  const rootPart = root?.replace(/^\/+|\/+$/g, '');
  const subPart = sub?.replace(/^\/+|\/+$/g, '');
  return `${base}/${container}/${rootPart}/${subPart}/`;
}

// ---- 4) Create encoding job
export async function createEncodingJob(jwt: string, inputUri: string, outputUri: string, encSecret: string) {
  const job = {
    ExternalId: `auto-${Date.now()}`,
    ExternalType: 'vod',
    ContentAcquisition: {
      Provider: 'AzureBlob',
      UriPath: inputUri,
      CredentialsName: 'MOSAIC_INPUT',
      CredentialsSecret: encSecret,
      CredentialsProtection: 'Encrypted',
    },
    MediaMappings: { VideoStreamExpression: '^.*\\.(mp4|mov)$' },
    ContentProcessing: { ProcessingProfileId: PROFILE_ID },
    ContentPublishing: {
      Provider: 'AzureBlob',
      UriPath: outputUri,
      CredentialsName: 'MOSAIC_OUTPUT',
      CredentialsSecret: encSecret,
      CredentialsProtection: 'Encrypted',
    },
  };

  const r = await fetch(`${ENCODING_BASE}/Job`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
    body: JSON.stringify(job),
  });
  if (r.status !== 201) throw new Error(`Create job failed ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.JobId as string;
}

// ---- 5) Poll job
export async function pollJob(jwt: string, jobId: string, timeoutMs = 30*60*1000) {
  const start = Date.now();
  for (;;) {
    const r = await fetch(`${ENCODING_BASE}/reporting/${jobId}`, {
      headers: { authorization: `Bearer ${jwt}` },
    });
    if (!r.ok) throw new Error(`Reporting failed ${r.status} ${await r.text()}`);
    const j = await r.json();
    const state = j?.State || j?.state;
    if (/(Succeeded|JobSuccess)/i.test(state)) return j;
    if (/(Failed|FinalError)/i.test(state)) throw new Error(`Encoding failed: ${JSON.stringify(j)}`);
    if (Date.now() - start > timeoutMs) throw new Error('Encoding timed out');
    await new Promise(res => setTimeout(res, 5000));
  }
}

// ---- 6) Derive manifests from output UriPath
export function deriveManifests(outputUri: string) {
  const base = outputUri.replace(/\/+$/,'');
  return {
    dashUrl: `${base}/dash/manifest.mpd`,
    hlsUrl: `${base}/hls/master.m3u8`,
  };
}

// ---- 7) Load KIDs from keys.json
export function kidsFromKeystore(keystore: any): Kids {
  const items = Array.isArray(keystore?.content_keys) ? keystore.content_keys : [];
  const out: Kids = {};
  for (const e of items) {
    const pol = String(e.policy || e.label || e.track_type || '').toUpperCase();
    const kid = String(e.kid || e.KID || '').toLowerCase();
    if (['AUDIO','SD','HD','UHD'].includes(pol) && kid) {
      out[pol as keyof Kids] = kid;
    }
  }
  return out;
}

// ---- 8) Optional KSM validation
export async function validateKidsWithKSM(expected: Kids) {
  if (!VALIDATE_KIDS || !KS_BASE || !KS_TENANT_ID || !KS_MGMT_KEY) return { ok: true, note: 'skipped' };
  const basic = Buffer.from(`${KS_TENANT_ID}:${KS_MGMT_KEY}`).toString('base64');
  const r = await fetch(`${KS_BASE}/content-keys`, { headers: { authorization: `Basic ${basic}` } });
  if (!r.ok) throw new Error(`KSM list failed ${r.status} ${await r.text()}`);
  const data = await r.json();
  const actual: Kids = {};
  for (const it of data?.items || []) {
    const tier = String(it.policy || it.label).toUpperCase();
    const kid = String(it.kid || '').toLowerCase();
    if (['AUDIO','SD','HD','UHD'].includes(tier) && kid) actual[tier as keyof Kids] = kid;
  }
  const mismatches: string[] = [];
  for (const t of ['AUDIO','SD','HD','UHD'] as const) {
    if (expected[t] && actual[t] && expected[t] !== actual[t]) mismatches.push(`${t}: ${expected[t]} != ${actual[t]}`);
  }
  return { ok: mismatches.length === 0, detail: mismatches.join('; ') || 'match' };
}
