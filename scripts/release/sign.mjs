// Signs a release ZIP: prints the manifest to paste into 連携・ライセンス > リリース配布, and writes it next to the ZIP.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [zipPath,versionArg]=process.argv.slice(2);if(!zipPath)throw Error('使い方: pnpm run release:sign release/akinai-hub-<version>.zip [version]');
const version=versionArg||JSON.parse(await readFile('package.json','utf8')).version;if(!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/.test(version))throw Error('バージョンが不正です: '+version);
const keyText=process.env.RELEASE_SIGNING_KEY||(await readFile(process.env.RELEASE_SIGNING_KEY_FILE||'release-signing-key.txt','utf8')).trim();
const key=await crypto.subtle.importKey('pkcs8',Buffer.from(keyText,'base64url'),{name:'Ed25519'},false,['sign']);
const zip=await readFile(zipPath);const sha256=createHash('sha256').update(zip).digest('hex');const size=zip.length;
const signature=Buffer.from(await crypto.subtle.sign({name:'Ed25519'},key,new TextEncoder().encode(`akinai-release:v1:${version}:${sha256}:${size}`))).toString('base64url');
const manifest={version,sha256,size,signature};await writeFile(zipPath+'.release.json',JSON.stringify(manifest)+'\n');console.log(JSON.stringify(manifest));
