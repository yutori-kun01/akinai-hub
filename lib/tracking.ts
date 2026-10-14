import {db,get,auditStatement} from './server';
import {sign} from './mail';
import {b64url,unb64url,same} from './jwt';
// Open pixel and click redirect for marketing mail. URLs carry the job id and an HMAC (MAIL_TOKEN_SECRET), so nobody can
// forge hits for other recipients or use the click endpoint as an open redirect to arbitrary sites.
const mac=async(text:string)=>(await sign(text)).slice(0,32);
export async function openUrl(origin:string,jobId:string){return origin+'/api/mail/o?j='+b64url(jobId)+'&s='+await mac('open:'+jobId);}
export async function clickUrl(origin:string,jobId:string,url:string){return origin+'/api/mail/c?j='+b64url(jobId)+'&u='+encodeURIComponent(url)+'&s='+await mac('click:'+jobId+'\n'+url);}
function jobIdOf(j:string){try{const id=new TextDecoder().decode(unb64url(j));return id.length>0&&id.length<=500?id:null;}catch{return null;}}
export async function readOpen(q:URLSearchParams){const id=jobIdOf(q.get('j')||'');return id&&same(await mac('open:'+id),q.get('s')||'')?id:null;}
export async function readClick(q:URLSearchParams){const id=jobIdOf(q.get('j')||''),url=q.get('u')||'';if(!id||!/^https:\/\/[^\s]+$/.test(url)||url.length>2000)return null;return same(await mac('click:'+id+'\n'+url),q.get('s')||'')?{id,url}:null;}
// Records the hit against the job's campaign and contact. A click on a campaign with clickTag adds that tag (which can start a step sequence);
// clickRemoveTag removes one (e.g. leaves a sequence whose excluded/target tag it is).
export async function recordMailEvent(jobId:string,type:'open'|'click',url:string|null=null){const job=await db().prepare("SELECT owner,contact_id,campaign_id FROM jobs WHERE id=? AND category='marketing' AND status='sent'").bind(jobId).first<{owner:string;contact_id:string;campaign_id:string}>();if(!job)return false;
 await db().prepare('INSERT INTO mail_events(id,owner,job_id,contact_id,campaign_id,type,url,created) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),job.owner,jobId,job.contact_id,job.campaign_id,type,url,Date.now()).run();
 if(type==='click'){const source=await get(job.owner,job.campaign_id);const add=source?.clickTag||'',remove=source?.clickRemoveTag||'';if(add||remove){for(let attempt=0;attempt<3;attempt++){const c=await get(job.owner,job.contact_id);if(c?.kind!=='contacts')break;const tags=[...new Set([...c.tags.filter((t:string)=>t!==remove),...(add?[add]:[])])].slice(0,30);if(JSON.stringify(tags)===JSON.stringify(c.tags))break;const {id,kind,version,created,updated,...data}=c;data.tags=tags;const r=await db().prepare('UPDATE records SET data=?,version=version+1,updated=? WHERE owner=? AND id=? AND version=?').bind(JSON.stringify(data),Date.now(),job.owner,id,version).run();if(r.meta.changes){await auditStatement(job.owner,'mail:click-tag',id).run();break;}}}}
 return true;}
export async function engagementOf(owner:string,contactId:string,campaignId:string){const rows=(await db().prepare('SELECT DISTINCT type FROM mail_events WHERE owner=? AND contact_id=? AND campaign_id=?').bind(owner,contactId,campaignId).all<{type:string}>()).results;return {opened:rows.length>0,clicked:rows.some(r=>r.type==='click')};}
