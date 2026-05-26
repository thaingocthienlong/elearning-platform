import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const [,, audioIn, sdIn, hdIn, keysPath, skdUri] = process.argv;
if (!audioIn || !sdIn || !hdIn || !keysPath || !skdUri) {
  console.error('usage: node scripts/drm/package-hls.mjs <audio.mp4> <sd.mp4> <hd.mp4> <keys.json> <skd://ASSET_ID>');
  process.exit(1);
}
const j = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));
const by = Object.fromEntries(j.tracks.map(t => [t.type, t]));
const hex = (b64) => Buffer.from(b64, 'base64').toString('hex');
const ivOr = (b64) => b64 ? hex(b64) : crypto.randomBytes(16).toString('hex');

if (!by.AUDIO || !by.SD || !by.HD) {
  console.error('keys.json missing AUDIO/SD/HD tracks');
  process.exit(1);
}

const AUDIO_KID = hex(by.AUDIO.key_id), AUDIO_KEY = hex(by.AUDIO.key), AUDIO_IV = ivOr(by.AUDIO.iv);
const SD_KID    = hex(by.SD.key_id),    SD_KEY    = hex(by.SD.key),    SD_IV    = ivOr(by.SD.iv);
const HD_KID    = hex(by.HD.key_id),    HD_KEY    = hex(by.HD.key),    HD_IV    = ivOr(by.HD.iv);

fs.mkdirSync('out/fp', { recursive: true });

const args = [
  `in=${audioIn},stream=audio,output=out/fp/audio.mp4,drm_label=AUDIO`,
  `in=${sdIn},stream=video,output=out/fp/sd.mp4,drm_label=SD`,
  `in=${hdIn},stream=video,output=out/fp/hd.mp4,drm_label=HD`,
  '--protection_scheme', 'cbcs',
  '--enable_raw_key_encryption',
  '--keys',
  `label=AUDIO:key_id=${AUDIO_KID}:key=${AUDIO_KEY}:iv=${AUDIO_IV},label=SD:key_id=${SD_KID}:key=${SD_KEY}:iv=${SD_IV},label=HD:key_id=${HD_KID}:key=${HD_KEY}:iv=${HD_IV}`,
  '--protection_systems', 'FairPlay',
  '--hls_master_playlist_output', 'out/fp/master.m3u8',
  '--hls_key_uri', skdUri,
];

const r = spawnSync('packager', args, { stdio: 'inherit', shell: false });
process.exit(r.status ?? 0);
