// Buyer-side updater. Default is a dry run: it checks the license, downloads the newest release you are entitled to,
// verifies size, SHA-256 and the seller's Ed25519 signature, and lists what would change. --apply writes the files
// (backing up everything it replaces); --deploy additionally installs, migrates the remote D1, builds and deploys.
import {readFile,writeFile,mkdir,rm,stat,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {unzip} from './zip.mjs';
import {execFileSync} from 'node:child_process';
import {dirname,join} from 'node:path';
const args=new Set(process.argv.slice(2));const apply=args.has('--apply')||args.has('--deploy'),deploy=args.has('--deploy');
const KEEP=/^(?:wrangler\.standalone\.json|\.dev\.vars.*|\.env.*|release-signing-key\.txt|\.git\/.*|node_modules\/.*|dist\/.*|\.wrangler\/.*|\.akinai-update-backup\/.*)$/;
async function vars(){const out={};for(const f of ['.dev.vars','.env.update']){try{for(const line of (await readFile(f,'utf8')).split(/\r?\n/)){const m=/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/.exec(line);if(m)out[m[1]]=m[2];}}catch{}}return out;}
const local=await vars();const env=k=>process.env[k]||local[k]||'';
const key=env('LICENSE_KEY'),server=env('LICENSE_SERVER');if(!key||!server)throw Error('LICENSE_KEY と LICENSE_SERVER を環境変数または .env.update に設定してください');
const pub=env('RELEASE_PUBLIC_KEY')||(await readFile('release-public-key.txt','utf8').catch(()=>'')).trim();if(!pub)throw Error('release-public-key.txt（販売者の公開鍵）が見つかりません。署名を検証できない更新は適用しません');
const pkg=JSON.parse(await readFile('package.json','utf8'));let origin='';try{origin=JSON.parse(await readFile('wrangler.standalone.json','utf8')).vars?.PUBLIC_ORIGIN||'';}catch{}origin=env('PUBLIC_ORIGIN')||origin;if(!origin)throw Error('PUBLIC_ORIGIN（設置先URL）が分かりません。wrangler.standalone.json を確認してください');
const base=new URL(server);if(base.protocol!=='https:')throw Error('LICENSE_SERVER はhttpsで指定してください');
const res=await fetch(new URL('/api/license/check',base.origin),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,origin,version:pkg.version})});const info=await res.json();
if(!res.ok||!info.valid)throw Error('ライセンス確認に失敗しました: '+(info.error||res.status));
console.log(`現在 v${pkg.version} / 配布中の最新 ${info.latest?'v'+info.latest.version:'なし'}${info.updatesExpired?'（更新期限後のバージョンは対象外）':''}`);
if(!info.updateAvailable||!info.download){console.log('適用できる更新はありません。');process.exit(0);}
const m=info.latest;const zip=Buffer.from(await (await fetch(info.download.url)).arrayBuffer());
if(zip.length!==m.size||createHash('sha256').update(zip).digest('hex')!==m.sha256)throw Error('ダウンロードしたファイルが署名情報と一致しません。適用を中止しました');
const verifyKey=await crypto.subtle.importKey('raw',Buffer.from(pub,'base64url'),{name:'Ed25519'},false,['verify']);
if(!await crypto.subtle.verify({name:'Ed25519'},verifyKey,Buffer.from(m.signature,'base64url'),new TextEncoder().encode(`akinai-release:v1:${m.version}:${m.sha256}:${m.size}`)))throw Error('販売者の署名を確認できません。適用を中止しました');
console.log('署名・SHA-256を確認しました。');
const files=unzip(zip);const hash=b=>createHash('sha256').update(b).digest('hex');
const oldInventory=JSON.parse(await readFile('FILES.sha256.json','utf8').catch(()=>'[]'));const oldHash=new Map(oldInventory.map(f=>[f.path,f.sha256]));
const changes=[],conflicts=[],removals=[];
for(const [path,data] of files){if(KEEP.test(path))continue;const current=await readFile(path).catch(()=>null);if(current&&hash(current)===hash(data))continue;changes.push(path);if(current&&oldHash.has(path)&&oldHash.get(path)!==hash(current))conflicts.push(path);}
for(const f of oldInventory)if(!files.has(f.path)&&!KEEP.test(f.path)){const current=await readFile(f.path).catch(()=>null);if(current){if(hash(current)===f.sha256)removals.push(f.path);else conflicts.push(f.path+'（新版では削除）');}}
console.log(`変更 ${changes.length} ファイル / 削除 ${removals.length} ファイル`);if(conflicts.length)console.log('ご自身で編集したファイルが上書きされます（バックアップを残します）:\n  '+conflicts.join('\n  '));
if(!apply){console.log('\n確認のみ行いました。適用するには: pnpm run update -- --apply（デプロイまで行う場合は --deploy）');process.exit(0);}
const backup=join('.akinai-update-backup',new Date().toISOString().replace(/[:.]/g,'-')+'-v'+pkg.version);
for(const path of [...changes,...removals]){if(await stat(path).then(()=>true,()=>false)){await mkdir(dirname(join(backup,path)),{recursive:true});await copyFile(path,join(backup,path));}}
for(const path of changes){await mkdir(dirname(path)||'.',{recursive:true});await writeFile(path,files.get(path));}
for(const path of removals)await rm(path);
console.log(`v${m.version} のファイルを適用しました。置き換え前のファイル: ${backup}`);
if(!deploy){console.log('次の手順: pnpm install --frozen-lockfile → pnpm run db:migrate:standalone → pnpm run build:standalone → pnpm run deploy:standalone');process.exit(0);}
const run=(cmd,a)=>{console.log('$ '+cmd+' '+a.join(' '));execFileSync(cmd,a,{stdio:'inherit'});};
run('pnpm',['install','--frozen-lockfile']);run('pnpm',['run','db:migrate:standalone']);run('pnpm',['run','build:standalone']);run('pnpm',['run','deploy:standalone']);
console.log(`v${m.version} へ更新し、デプロイしました。管理画面で動作を確認してください。`);
