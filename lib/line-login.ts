import {db,cfg,get,list,auditStatement} from './server';
import {workspace} from './auth';
// One-tap LINE linking with LINE Login (instead of sending a code in the chat). The LINE Login channel must belong to the
// same provider as the Messaging API channel, otherwise the user IDs differ and the link would point at nobody.
export const lineLoginConfigured=()=>!!(cfg().LINE_LOGIN_CHANNEL_ID&&cfg().LINE_LOGIN_CHANNEL_SECRET);
const hex=(n:number)=>Array.from(crypto.getRandomValues(new Uint8Array(n))).map(x=>x.toString(16).padStart(2,'0')).join('');
export async function startLineLogin(contactId:string,buyer:string,pageId:string,tag:string,origin:string){if(!lineLoginConfigured())throw Error('LINEログインは未設定です');const state=hex(24),nonce=hex(16);
 await db().prepare('INSERT INTO system_state(id,data,updated) VALUES(?,?,?)').bind('line-login:'+state,JSON.stringify({owner:workspace(),contactId,buyer,pageId,tag,nonce}),Date.now()).run();
 return 'https://access.line.me/oauth2/v2.1/authorize?'+new URLSearchParams({response_type:'code',client_id:cfg().LINE_LOGIN_CHANNEL_ID,redirect_uri:origin+'/api/line/login',state,scope:'profile openid',nonce,bot_prompt:'aggressive'}).toString();}
// Returns the page to continue to. The state is single-use, 10 minutes, and tied to the same signed-in buyer.
export async function finishLineLogin(state:string,code:string,buyer:string,origin:string){const key='line-login:'+state;const row=await db().prepare('DELETE FROM system_state WHERE id=? AND updated>? RETURNING data').bind(key,Date.now()-10*60000).first<{data:string}>();if(!row||!/^[a-f0-9]{48}$/.test(state))throw Error('連携の有効期限が切れました。もう一度お試しください');const s=JSON.parse(row.data);if(s.buyer!==buyer)throw Error('ログイン中のアカウントが異なります');
 const t=await fetch('https://api.line.me/oauth2/v2.1/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:origin+'/api/line/login',client_id:cfg().LINE_LOGIN_CHANNEL_ID,client_secret:cfg().LINE_LOGIN_CHANNEL_SECRET})});const tok=await t.json() as {access_token?:string};if(!t.ok||!tok.access_token)throw Error('LINEログインに失敗しました');
 const p=await fetch('https://api.line.me/v2/profile',{headers:{Authorization:'Bearer '+tok.access_token}});const prof=await p.json() as {userId?:string;displayName?:string};if(!p.ok||!/^U[0-9a-f]{32}$/.test(prof.userId||''))throw Error('LINEのプロフィールを取得できませんでした');
 const owner=s.owner,id='line:'+owner+':'+prof.userId;const contact=await get(owner,s.contactId);if(contact?.kind!=='contacts')throw Error('顧客が見つかりません');
 const other=(await list(owner,'lineContacts')).find(x=>x.contactId===contact.id&&x.id!==id);if(other)throw Error('このアカウントは別のLINEと連携済みです');
 // Not followed yet: create the record now (unsubscribed); the follow webhook marks it subscribed.
 const now=Date.now();await db().prepare("INSERT OR IGNORE INTO records(id,owner,kind,data,created,updated) VALUES(?,?,'lineContacts',?,?,?)").bind(id,owner,JSON.stringify({name:prof.displayName?.slice(0,100)||'LINE友だち '+prof.userId!.slice(-6),userId:prof.userId,contactId:'',tags:[],status:'unsubscribed',eventAt:0}),now,now).run();
 const c=await get(owner,id);const tags=[...new Set([...(c!.tags||[]),...(s.tag?[s.tag]:[])])].slice(0,30);
 const r=await db().prepare("UPDATE records SET data=json_set(data,'$.contactId',?,'$.tags',json(?)),version=version+1,updated=? WHERE id=? AND owner=? AND (json_extract(data,'$.contactId')='' OR json_extract(data,'$.contactId')=?)").bind(contact.id,JSON.stringify(tags),now,id,owner,contact.id).run();if(!r.meta.changes)throw Error('このLINEは別のアカウントと連携済みです');await auditStatement(owner,'line:linked-login',id).run();
 return '/line-connect?page='+encodeURIComponent(s.pageId||'')+'&linked=1';}
