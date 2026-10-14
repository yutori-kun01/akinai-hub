// Creates the Ed25519 key pair used to sign releases. Run once on the seller's machine; keep the private key offline.
import {writeFile,access} from 'node:fs/promises';
const b64url=b=>Buffer.from(b).toString('base64url');
const out=process.argv[2]||'release-signing-key.txt';
if(await access(out).then(()=>true,()=>false))throw Error(out+' は既にあります。上書きしません。');
const pair=await crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);
const priv=b64url(await crypto.subtle.exportKey('pkcs8',pair.privateKey)),pub=b64url(await crypto.subtle.exportKey('raw',pair.publicKey));
await writeFile(out,priv+'\n',{mode:0o600,flag:'wx'});await writeFile('release-public-key.txt',pub+'\n');
console.log('秘密鍵: '+out+'（Git・ZIP・サーバーに置かないでください）\n公開鍵: release-public-key.txt に保存しました\n販売用Akinai hubのシークレット/変数 RELEASE_PUBLIC_KEY='+pub);
