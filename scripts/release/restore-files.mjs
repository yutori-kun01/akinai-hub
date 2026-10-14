import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const [dir,confirmation]=process.argv.slice(2);if(!dir||confirmation!=='--restore-files')throw Error('Usage: node scripts/release/restore-files.mjs ./backup-export --restore-files');
const c=JSON.parse(await readFile('wrangler.standalone.json','utf8'));const m=JSON.parse(await readFile(resolve(dir,'manifest.json'),'utf8'));const files=JSON.parse(await readFile(resolve(dir,'files.json'),'utf8'));if(m.owner!==c.vars.WORKSPACE_ID)throw Error('店舗IDが異なります');
for(const f of files){if(!/^[a-f0-9]{64}\.bin$/.test(f.file)||!f.key.startsWith('backups/'+m.owner+'/')||!m.files.some(x=>x.copy===f.key))throw Error('ファイル参照が不正です');const local=resolve(dir,f.file);const bytes=await readFile(local);if(createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('ファイルが変更されています');const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','r2','object','put',c.r2_buckets[0].bucket_name+'/'+f.key,'--remote','--file',local,'--config','wrangler.standalone.json'],{stdio:'inherit'});if(r.status!==0)throw Error('R2復元失敗');}
console.log('R2のバックアップファイルを戻しました。管理画面からmanifest.jsonを確認して復元してください。');
