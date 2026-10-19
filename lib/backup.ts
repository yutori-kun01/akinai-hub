import {env} from 'cloudflare:workers';
import {db,auditStatement} from './server';
import {schemas,kinds} from './core';
import {z} from 'zod';
import {digest} from './auth';
import {imageKey} from './page-schema';
const order=z.object({productId:z.string(),contactId:z.string(),productName:z.string(),amount:z.number().int().nonnegative(),method:z.enum(['bank','card']),status:z.enum(['pending_bank','pending_card','paid','cancelled','revoked']),sessionId:z.string().nullable().optional(),buyer:z.string().optional(),pageId:z.string().optional(),termsVersion:z.number().optional()});
const row=z.object({id:z.string().min(1).max(200),owner:z.string(),kind:z.string(),data:z.string(),version:z.number().int().positive(),created:z.number(),updated:z.number()});
const job=z.object({id:z.string().min(1).max(500),owner:z.string(),contact_id:z.string(),campaign_id:z.string(),subject:z.string(),body:z.string(),category:z.enum(['marketing','transactional']),due:z.number(),status:z.enum(['queued','sending','sent','suppressed','failed','cancelled']),attempts:z.number().int().nonnegative(),error:z.string().nullable(),provider:z.string().nullable(),provider_id:z.string().nullable(),created:z.number()});
const snapshotSchema=z.object({format:z.literal('commerce-backup-v2'),owner:z.string(),created:z.number(),records:z.array(row).max(10000),jobs:z.array(job).max(30000),files:z.array(z.object({key:z.string(),copy:z.string(),size:z.number(),etag:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/)})).max(1000),suppressions:z.array(z.object({email:z.string().email(),reason:z.string(),created:z.number()})).max(30000)});
async function fileHash(bytes:ArrayBuffer){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export type Snapshot=z.infer<typeof snapshotSchema>;
export async function createBackup(owner:string){
 if(!env.BUCKET)throw Error('ストレージが未接続です');
 const records=(await db().prepare('SELECT * FROM records WHERE owner=?').bind(owner).all()).results;
 const jobs=(await db().prepare('SELECT * FROM jobs WHERE owner=?').bind(owner).all()).results;
 const suppressions=(await db().prepare('SELECT email,reason,created FROM suppressions WHERE owner=?').bind(owner).all()).results;
 const prefix='backups/'+owner+'/'+Date.now()+'-'+crypto.randomUUID();
 const files:Snapshot['files']=[];const keys=new Set<string>();for(const r of records){if(r.kind==='products'){const d=JSON.parse(String(r.data));if(d.deliveryKey)keys.add(d.deliveryKey);}if(r.kind==='pages')for(const b of JSON.parse(String(r.data)).blocks||[]){const k=['image','bubble'].includes(b.type)&&imageKey(owner,b.url||'');if(k)keys.add(k);}}
 if(keys.size>1000||records.length>10000||jobs.length>30000)throw Error('バックアップ上限を超えています。D1/R2の直接バックアップを使用してください');
 for(const key of keys){if(!key.startsWith(owner+'/'))throw Error('ファイルの所有者が異なります');const file=await env.BUCKET.get(key);if(!file&&key.startsWith(owner+'/images/'))continue;if(!file)throw Error('納品ファイルが見つかりません: '+key);const copy=prefix+'/files/'+encodeURIComponent(key);const bytes=await file.arrayBuffer();const sha256=await fileHash(bytes);await env.BUCKET.put(copy,bytes,{httpMetadata:file.httpMetadata,customMetadata:file.customMetadata});files.push({key,copy,size:file.size,etag:file.etag,sha256});}
 const snapshot=snapshotSchema.parse({format:'commerce-backup-v2',owner,created:Date.now(),records,jobs,files,suppressions});
 const key=prefix+'/manifest.json';await env.BUCKET.put(key,JSON.stringify(snapshot),{httpMetadata:{contentType:'application/json'}});await auditStatement(owner,'backup:create',key).run();return {key,snapshot};
}
export function validateBackup(value:unknown,owner:string){
 const s=snapshotSchema.parse(value);if(s.owner!==owner)throw Error('異なる店舗のバックアップは復元できません');
 const ids=new Set<string>();for(const r of s.records){if(r.owner!==owner||ids.has(r.id))throw Error('所有者・IDが不正です');ids.add(r.id);const data=JSON.parse(r.data);if(r.kind==='orders')order.parse(data);else if(kinds.includes(r.kind as typeof kinds[number]))schemas[r.kind as typeof kinds[number]].parse(data);else throw Error('未対応のデータです');if(data.deliveryKey&&!data.deliveryKey.startsWith(owner+'/'))throw Error('納品ファイルの所有者が異なります');}
 for(const r of s.records){const d=JSON.parse(r.data);if((d.productId&&!ids.has(d.productId))||(d.contactId&&!ids.has(d.contactId)))throw Error('関連データが不足しています');}
 const jobIds=new Set<string>();for(const j of s.jobs){if(j.owner!==owner||!ids.has(j.contact_id)||jobIds.has(j.id))throw Error('配信履歴が不正です');jobIds.add(j.id);}
 for(const f of s.files)if(!f.key.startsWith(owner+'/')||!f.copy.startsWith('backups/'+owner+'/'))throw Error('ファイル参照が不正です');
 for(const r of s.records){const d=JSON.parse(r.data);if(d.deliveryKey&&!s.files.some(f=>f.key===d.deliveryKey))throw Error('納品ファイルのバックアップが不足しています');}
 return s;
}
export async function restoreBackup(owner:string,value:unknown,confirmHash?:string){
 const s=validateBackup(value,owner);const hash=await digest(JSON.stringify(s));const preview={hash,records:s.records.length,jobs:s.jobs.length,files:s.files.length,cancelled:s.jobs.filter(j=>['queued','sending'].includes(j.status)).length};if(!confirmHash)return preview;if(confirmHash!==hash)throw Error('確認後にバックアップが変更されました');
 if(!env.BUCKET)throw Error('ストレージが未接続です');
 // Restore points reference immutable copies. Check before replacing any live records.
 for(const f of s.files){const file=await env.BUCKET.get(f.copy);if(!file||file.size!==f.size||await fileHash(await file.arrayBuffer())!==f.sha256)throw Error('バックアップファイルが不足・変更されています');}
 await createBackup(owner);
 const currentLine=(await db().prepare("SELECT * FROM records WHERE owner=? AND kind='lineContacts'").bind(owner).all<any>()).results;
 const mapped=s.records.map(r=>{const d=JSON.parse(r.data);if(r.kind==='lineContacts'){const current=currentLine.find(c=>c.id===r.id);const live=current?JSON.parse(current.data):null;if(live&&live.eventAt>=(d.eventAt||0)){d.status=live.status;d.eventAt=live.eventAt;}}if(d.deliveryKey){const f=s.files.find(f=>f.key===d.deliveryKey)!;d.deliveryKey=owner+'/restored/'+hash+'/'+encodeURIComponent(f.key);}return {...r,data:JSON.stringify(d),version:r.version+1,updated:Date.now()};});
 for(const r of currentLine){const d=JSON.parse(r.data);if(d.status==='unsubscribed'&&!mapped.some(m=>m.id===r.id))mapped.push({...r,data:JSON.stringify({...d,contactId:''})});}
 for(const f of s.files){const file=await env.BUCKET.get(f.copy);if(!file)throw Error('ファイルを取得できません');await env.BUCKET.put(f.key.startsWith(owner+'/images/')?f.key:owner+'/restored/'+hash+'/'+encodeURIComponent(f.key),file.body,{httpMetadata:file.httpMetadata,customMetadata:file.customMetadata});}
 const restoredJobs=s.jobs.map(j=>['queued','sending'].includes(j.status)?{...j,status:'cancelled',error:'復元時に重複配信防止のため停止'}:j);
 await db().batch([
 db().prepare('DELETE FROM jobs WHERE owner=?').bind(owner),db().prepare('DELETE FROM records WHERE owner=?').bind(owner),
 db().prepare("INSERT INTO records(id,owner,kind,data,version,created,updated) SELECT json_extract(value,'$.id'),json_extract(value,'$.owner'),json_extract(value,'$.kind'),json_extract(value,'$.data'),json_extract(value,'$.version'),json_extract(value,'$.created'),json_extract(value,'$.updated') FROM json_each(?)").bind(JSON.stringify(mapped)),
 db().prepare("INSERT INTO jobs(id,owner,contact_id,campaign_id,subject,body,category,due,status,attempts,error,provider_id,created,provider) SELECT json_extract(value,'$.id'),json_extract(value,'$.owner'),json_extract(value,'$.contact_id'),json_extract(value,'$.campaign_id'),json_extract(value,'$.subject'),json_extract(value,'$.body'),json_extract(value,'$.category'),json_extract(value,'$.due'),json_extract(value,'$.status'),json_extract(value,'$.attempts'),json_extract(value,'$.error'),json_extract(value,'$.provider_id'),json_extract(value,'$.created'),json_extract(value,'$.provider') FROM json_each(?)").bind(JSON.stringify(restoredJobs)),
 db().prepare("INSERT OR IGNORE INTO suppressions(id,owner,email,reason,created) SELECT ? || ':' || json_extract(value,'$.email'),?,json_extract(value,'$.email'),json_extract(value,'$.reason'),json_extract(value,'$.created') FROM json_each(?)").bind(owner,owner,JSON.stringify(s.suppressions)),auditStatement(owner,'backup:restored',hash)]);
 return {...preview,restored:true};
}
