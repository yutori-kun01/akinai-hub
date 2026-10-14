import {env} from 'cloudflare:workers';
import {sendMail,selectedProvider} from './mail-providers';
const config=()=>env as unknown as Record<string,string>;
const database=()=>{if(!env.DB)throw Error('Database unavailable');return env.DB;};
export const standalone=()=>config().AUTH_MODE==='standalone';
export const workspace=()=>config().WORKSPACE_ID||'store';
export type Identity={userId:string;email:string;displayName:string;role:'admin'|'customer'};
export async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export function randomToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export function equal(a:string,b:string){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;}
export async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},key,256))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export function checkOrigin(req:Request){if(req.headers.get('origin')!==new URL(req.url).origin)throw Error('ORIGIN');const expected=config().PUBLIC_ORIGIN;if(standalone()&&expected&&new URL(req.url).origin!==new URL(expected).origin)throw Error('ORIGIN');}
export async function identity(headers:Headers):Promise<Identity|null>{
 if(!standalone()){const userId=headers.get('oai-authenticated-user-id');const email=headers.get('oai-authenticated-user-email')||'';return userId?{userId,email,displayName:email,role:'admin'}:null;}
 const token=headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-commerce_session='))?.split('=')[1];
 if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 const row=await database().prepare('SELECT email FROM auth_sessions WHERE hash=? AND expires>?').bind(await digest(token),Date.now()).first<{email:string}>();
 if(!row)return null;const role=row.email===config().ADMIN_EMAIL?.toLowerCase()?'admin':'customer';return {userId:'email:'+row.email,email:row.email,displayName:row.email,role};
}
export async function customerOf(req:Request){if(!['GET','HEAD'].includes(req.method))checkOrigin(req);const u=await identity(req.headers);if(!u)throw Error('AUTH');return u;}
export async function limited(key:string,max:number,minutes:number){const slot=Math.floor(Date.now()/(minutes*60000));const id=await digest(key+':'+slot);const row=await database().prepare('INSERT INTO auth_limits(id,count,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(id,Date.now()+minutes*120000).first<{count:number}>();if(!row||row.count>max)throw Error('しばらく待ってから再試行してください');}
const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
async function session(email:string){const token=randomToken();await database().prepare('INSERT INTO auth_sessions(hash,email,expires) VALUES(?,?,?)').bind(await digest(token),email,Date.now()+7*86400000).run();return json({ok:true},200,{'Set-Cookie':'__Host-commerce_session='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800'});}
export async function authAction(req:Request,action:string){
 if(!standalone())return json({error:'独立ホスティング版で使用する機能です'},404);
 try{
 checkOrigin(req);const raw=await req.text();if(raw.length>5000)throw Error('入力が大きすぎます');const data=JSON.parse(raw||'{}');
 const ip=req.headers.get('cf-connecting-ip')||'local';await limited('ip:'+ip,40,10);
 if(action==='logout'){const token=req.headers.get('cookie')?.match(/(?:^|;\s*)__Host-commerce_session=([a-f0-9]{64})/)?.[1];if(token)await database().prepare('DELETE FROM auth_sessions WHERE hash=?').bind(await digest(token)).run();return json({ok:true},200,{'Set-Cookie':'__Host-commerce_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});}
 const email=String(data.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Error('メールアドレスを確認してください');
 if(action==='setup'){
  await limited('setup:'+ip,5,15);
  if(!config().SETUP_TOKEN||config().SETUP_TOKEN.length<32||!equal(String(data.token||''),config().SETUP_TOKEN)||email!==config().ADMIN_EMAIL?.toLowerCase())throw Error('初期設定情報を確認してください');
  if(typeof data.password!=='string'||data.password.length<14||data.password.length>128)throw Error('パスワードは14〜128文字にしてください');
  const salt=randomToken();const hash=await passwordHash(data.password,salt);
  const result=await database().prepare('INSERT OR IGNORE INTO auth_admin(id,email,salt,hash) VALUES(1,?,?,?)').bind(email,salt,hash).run();if(!result.meta.changes)throw Error('初期設定は完了しています。ログインしてください');return session(email);
 }
 if(action==='password'){
  await limited('password:'+email,6,15);const admin=await database().prepare('SELECT * FROM auth_admin WHERE id=1').first<{email:string;salt:string;hash:string}>();
  const hash=await passwordHash(String(data.password||'').slice(0,128),admin?.salt||'invalid');if(!admin||email!==admin.email||email!==config().ADMIN_EMAIL?.toLowerCase()||!equal(hash,admin.hash))throw Error('ログイン情報を確認してください');return session(email);
 }
 if(action==='request-code'){
  await limited('code:'+email,3,15);if(!config().AUTH_SECRET||config().AUTH_SECRET.length<32||config().MAIL_ENABLED!=='true')throw Error('メール認証は準備中です');
  const settings=await database().prepare("SELECT data FROM records WHERE owner=? AND kind='settings' ORDER BY created DESC LIMIT 1").bind(workspace()).first<{data:string}>();const s=settings?JSON.parse(settings.data):{};
  if(await database().prepare("SELECT id FROM suppressions WHERE owner=? AND email=? AND reason!='unsubscribe'").bind(workspace(),email).first())throw Error('このメールアドレスへの配信が停止されています。販売者にお問い合わせください');const challenge=randomToken();const n=crypto.getRandomValues(new Uint32Array(1))[0];const code=String(n%1000000).padStart(6,'0');
  await database().prepare('INSERT INTO auth_codes(id,email,hash,expires,attempts) VALUES(?,?,?,?,0)').bind(challenge,email,await digest(config().AUTH_SECRET+challenge+code),Date.now()+10*60000).run();
  try{await sendMail(selectedProvider(s.mailProvider),config(),{id:'auth:'+challenge,to:email,subject:'ログイン認証コード',text:'認証コード: '+code+'\n\n有効期限は10分です。心当たりがない場合は破棄してください。',category:'transactional',fromName:s.fromName});}catch(e){console.warn('auth-mail-failed',e instanceof Error?e.message:'unknown');await database().prepare('DELETE FROM auth_codes WHERE id=?').bind(challenge).run();throw Error('認証メールを送信できませんでした。管理者にお問い合わせください');}
  return json({challenge});
 }
 if(action==='verify-code'){
  if(!/^[a-f0-9]{64}$/.test(String(data.challenge))||!/^\d{6}$/.test(String(data.code)))throw Error('認証コードを確認してください');
  const row=await database().prepare('UPDATE auth_codes SET attempts=attempts+1 WHERE id=? AND email=? AND expires>? AND attempts<5 RETURNING hash').bind(data.challenge,email,Date.now()).first<{hash:string}>();
  if(!row||!equal(row.hash,await digest(config().AUTH_SECRET+data.challenge+data.code)))throw Error('認証コードが無効か期限切れです');
  const used=await database().prepare('DELETE FROM auth_codes WHERE id=? AND email=? AND hash=?').bind(data.challenge,email,row.hash).run();if(!used.meta.changes)throw Error('使用済みのコードです');return session(email);
 }
 throw Error('未対応の操作です');
 }catch(e){const message=e instanceof Error?e.message:'処理できませんでした';return json({error:message==='ORIGIN'?'リクエスト元が不正です':message},message==='ORIGIN'?403:400);}
}
