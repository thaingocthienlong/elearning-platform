import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const [,, audioIn, sdIn, hdIn, keysPath] = process.argv;
if (!audioIn || !sdIn || !hdIn || !keysPath) {
  console.error('usage: node scripts/drm/package-dash.mjs <audio.mp4> <sd.mp4> <hd.mp4> <keys.json>');
  process.exit(1);
}

const j = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));
const by = Object.fromEntries(j.tracks.map(t => [t.type, t]));
const hex = (b64) => Buffer.from(b64, 'base64').toString('hex');

if (!by.AUDIO || !by.SD || !by.HD) {
  console.error('keys.json missing AUDIO/SD/HD tracks'); process.exit(1);
}

const AUDIO_KID = hex(by.AUDIO.key_id), AUDIO_KEY = hex(by.AUDIO.key);
const SD_KID    = hex(by.SD.key_id),    SD_KEY    = hex(by.SD.key);
const HD_KID    = hex(by.HD.key_id),    HD_KEY    = hex(by.HD.key);

fs.mkdirSync('out/cenc', { recursive: true });

const args = [
  `in=${audioIn},stream=audio,output=out/cenc/audio.mp4,drm_label=AUDIO`,
  `in=${sdIn},stream=video,output=out/cenc/sd.mp4,drm_label=SD`,
  `in=${hdIn},stream=video,output=out/cenc/hd.mp4,drm_label=HD`,
  '--enable_raw_key_encryption',
  '--keys', `label=AUDIO:key_id=${AUDIO_KID}:key=${AUDIO_KEY},label=SD:key_id=${SD_KID}:key=${SD_KEY},label=HD:key_id=${HD_KID}:key=${HD_KEY}`,
  '--protection_systems', 'Widevine',
  '--mpd_output', 'out/cenc/manifest.mpd',
];

const r = spawnSync('packager', args, { stdio: 'inherit', shell: false });
process.exit(r.status ?? 0);
