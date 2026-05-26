import crypto from 'node:crypto';
import fs from 'node:fs';

const ENDPOINT = 'https://key-server-management.axprod.net/api/WidevineProtectionInfo';

function signEnvelope(requestText) {
  const key = Buffer.from(process.env.MOSAIC_KEY_SIGNING_KEY, 'hex');
  const iv  = Buffer.from(process.env.MOSAIC_KEY_SIGNING_IV, 'hex');
  const sha1 = crypto.createHash('sha1').update(requestText).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([cipher.update(sha1), cipher.final()]).toString('base64');
}

async function main() {
  const args = process.argv.slice(2);
  const cid = args[0] || 'CID:video-123';
  const outIdx = args.indexOf('--out');
  const outFile = outIdx >= 0 ? args[outIdx + 1] : null;

  const contentIdB64 = Buffer.from(cid).toString('base64');
  const reqObj = {
    content_id: contentIdB64,
    drm_types: ['WIDEVINE','FAIRPLAY'],
    tracks: [{type:'AUDIO'},{type:'SD'},{type:'HD'}],
    protection_scheme: 'CENC'
  };
  const requestText = JSON.stringify(reqObj, null, 2);
  const envelope = {
    request: Buffer.from(requestText).toString('base64'),
    signature: signEnvelope(requestText),
    signer: process.env.MOSAIC_KEY_PROVIDER_NAME
  };

  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {'content-type':'application/json', accept:'application/json'},
    body: JSON.stringify(envelope)
  });
  const bodyText = await r.text();
  if (!r.ok) {
    if (outFile) fs.writeFileSync(outFile + '.error.txt', bodyText);
    console.error('HTTP', r.status, bodyText);
    process.exit(1);
  }
  const { response } = JSON.parse(bodyText);
  const responseText = Buffer.from(response, 'base64').toString('utf-8');

  if (outFile) fs.writeFileSync(outFile, responseText);
  else console.log(responseText);
}

main().catch(e => { console.error(e); process.exit(1); });
