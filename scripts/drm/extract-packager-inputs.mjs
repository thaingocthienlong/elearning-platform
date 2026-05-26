import fs from 'node:fs';

const j = JSON.parse(fs.readFileSync('keys.json','utf-8'));
const by = Object.fromEntries(j.tracks.map(t => [t.type, t]));
const b64ToHex = b => Buffer.from(b,'base64').toString('hex');

function line(name, val){ console.log(`${name}=${val}`); }

line('AUDIO_KID', b64ToHex(by.AUDIO.key_id));
line('AUDIO_KEY', b64ToHex(by.AUDIO.key));
line('SD_KID',    b64ToHex(by.SD.key_id));
line('SD_KEY',    b64ToHex(by.SD.key));
line('HD_KID',    b64ToHex(by.HD.key_id));
line('HD_KEY',    b64ToHex(by.HD.key));
line('WV_PSSH_HEX', b64ToHex(by.HD.pssh.find(p=>p.drm_type==='WIDEVINE').data));

// FairPlay IVs (use service IVs if present, else generate your own offline)
line('AUDIO_IV', by.AUDIO.iv ? b64ToHex(by.AUDIO.iv) : '');
line('SD_IV',    by.SD.iv    ? b64ToHex(by.SD.iv)    : '');
line('HD_IV',    by.HD.iv    ? b64ToHex(by.HD.iv)    : '');
