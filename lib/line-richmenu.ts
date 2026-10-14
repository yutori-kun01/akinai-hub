import {env} from 'cloudflare:workers';
import {db,cfg,get,list,auditStatement} from './server';
import {lineApi} from './line-protocol';
import {richMenuBody,checkRichMenuImage} from './line-messages';
import {imageKey} from './page-schema';
// Rich menus: the admin designs areas over an uploaded image; publishing creates the menu at LINE, uploads the image and,
// for the default menu, sets it for everyone. Menus with a tag are linked per user by the automation tick.
const token=()=>{const t=cfg().LINE_CHANNEL_ACCESS_TOKEN;if(!t)throw Error('LINEのアクセストークンが未設定です');return t;};
async function update(owner:string,id:string,change:Record<string,unknown>){const r=await get(owner,id);if(!r)return;const {id:_,kind,version,created,updated,...data}=r;Object.assign(data,change);await db().prepare('UPDATE records SET data=?,version=version+1,updated=? WHERE owner=? AND id=?').bind(JSON.stringify(data),Date.now(),owner,id).run();}
export async function publishRichMenu(owner:string,id:string){const menu=await get(owner,id);if(menu?.kind!=='richMenus')throw Error('リッチメニューがありません');const key=imageKey(owner,menu.imageUrl||'');if(!key||!env.BUCKET)throw Error('リッチメニュー画像をアップロードしてください');const file=await env.BUCKET.get(key);if(!file)throw Error('画像が見つかりません');const bytes=new Uint8Array(await file.arrayBuffer());const size=checkRichMenuImage(bytes);
 const created=await lineApi(token(),'richmenu',{json:richMenuBody(menu,{width:size.width,height:size.height})});const richMenuId=created?.richMenuId;if(!richMenuId)throw Error('LINEでメニューを作成できませんでした');
 try{await lineApi(token(),`richmenu/${richMenuId}/content`,{body:bytes,contentType:size.type,data:true});if(menu.isDefault)await lineApi(token(),`user/all/richmenu/${richMenuId}`,{method:'POST'});}catch(e){await lineApi(token(),`richmenu/${richMenuId}`,{method:'DELETE'}).catch(()=>{});throw e;}
 // Only one default: others lose the flag locally (LINE already switched to this one).
 if(menu.isDefault)for(const m of (await list(owner,'richMenus')).filter(m=>m.id!==id&&m.isDefault))await update(owner,m.id,{isDefault:false});
 const old=menu.lineMenuId;await update(owner,id,{lineMenuId:richMenuId,status:'published',publishedAt:Date.now()});
 if(old){await lineApi(token(),`richmenu/${old}`,{method:'DELETE'}).catch(()=>{});await db().prepare("UPDATE records SET data=json_set(data,'$.richMenuId','') WHERE owner=? AND kind='lineContacts' AND json_extract(data,'$.richMenuId')=?").bind(owner,old).run();}
 await auditStatement(owner,'line:richmenu-publish',id).run();return richMenuId as string;}
export async function unpublishRichMenu(owner:string,id:string){const menu=await get(owner,id);if(menu?.kind!=='richMenus')throw Error('リッチメニューがありません');if(menu.lineMenuId){if(menu.isDefault)await lineApi(token(),'user/all/richmenu',{method:'DELETE'}).catch(()=>{});await lineApi(token(),`richmenu/${menu.lineMenuId}`,{method:'DELETE'}).catch(()=>{});await db().prepare("UPDATE records SET data=json_set(data,'$.richMenuId','') WHERE owner=? AND kind='lineContacts' AND json_extract(data,'$.richMenuId')=?").bind(owner,menu.lineMenuId).run();}await update(owner,id,{lineMenuId:'',status:'draft'});await auditStatement(owner,'line:richmenu-unpublish',id).run();}
// Per-user menus by tag (UTAGE's リッチメニュー切替). Newest published tagged menu wins; no match falls back to the default.
export async function syncRichMenuLinks(owner:string){const menus=(await list(owner,'richMenus')).filter(m=>m.status==='published'&&m.lineMenuId&&m.tag).sort((a,b)=>b.publishedAt-a.publishedAt);const contacts=(await list(owner,'lineContacts')).filter(c=>c.status==='subscribed');const link=new Map<string,string[]>(),unlink:string[]=[];
 for(const c of contacts){const want=menus.find(m=>c.tags.includes(m.tag))?.lineMenuId||'';if(want===(c.richMenuId||''))continue;if(want){if(!link.has(want))link.set(want,[]);link.get(want)!.push(c.userId);}else unlink.push(c.userId);}
 let linked=0;for(const [menuId,users] of link)for(let i=0;i<users.length;i+=500){const batch=users.slice(i,i+500);await lineApi(token(),'richmenu/bulk/link',{json:{richMenuId:menuId,userIds:batch}});await db().prepare("UPDATE records SET data=json_set(data,'$.richMenuId',?) WHERE owner=? AND kind='lineContacts' AND json_extract(data,'$.userId') IN (SELECT value FROM json_each(?))").bind(menuId,owner,JSON.stringify(batch)).run();linked+=batch.length;}
 for(let i=0;i<unlink.length;i+=500){const batch=unlink.slice(i,i+500);await lineApi(token(),'richmenu/bulk/unlink',{json:{userIds:batch}});await db().prepare("UPDATE records SET data=json_set(data,'$.richMenuId','') WHERE owner=? AND kind='lineContacts' AND json_extract(data,'$.userId') IN (SELECT value FROM json_each(?))").bind(owner,JSON.stringify(batch)).run();linked+=batch.length;}
 return linked;}
