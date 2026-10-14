// Authenticated Wrangler is required. This copies immutable R2 backup objects locally.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const [manifestPath,outputDir]=process.argv.slice(2);if(!manifestPath||!outputDir)throw Error('Usage: node scripts/release/backup-files.mjs manifest.json ./backup-export');
const m=JSON.parse(await readFile(manifestPath,'utf8'));const c=JSON.parse(await readFile('wrangler.standalone.json','utf8'));if(m.format!=='commerce-backup-v2'||m.owner!==c.vars.WORKSPACE_ID)throw Error('店舗のバックアップではありません');
await mkdir(outputDir,{recursive:false});const mapping=[];
for(const f of m.files){if(!f.copy.startsWith('backups/'+m.owner+'/'))throw Error('Invalid file key');const name=createHash('sha256').update(f.copy).digest('hex')+'.bin';const local=resolve(outputDir,name);const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','r2','object','get',c.r2_buckets[0].bucket_name+'/'+f.copy,'--remote','--file',local,'--config','wrangler.standalone.json'],{stdio:'inherit'});if(r.status!==0)throw Error('R2ファイル取得失敗');const bytes=await readFile(local);if(bytes.length!==f.size)throw Error('サイズ不一致');mapping.push({key:f.copy,file:name,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(resolve(outputDir,'manifest.json'),JSON.stringify(m,null,2));await writeFile(resolve(outputDir,'files.json'),JSON.stringify(mapping,null,2));console.log('外部保管用バックアップを保存しました。個人情報を含むため暗号化して保管してください。');
