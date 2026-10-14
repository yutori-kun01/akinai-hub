import {cfg,db,response} from '@/lib/server';
import {standalone,workspace,digest} from '@/lib/auth';
import {verifyMailEvent,normalizeMailEvents} from '@/lib/mail-events';
export async function POST(req:Request,{params}:{params:Promise<{provider:string}>}){
 const {provider}=await params;const raw=await req.text();if(raw.length>1000000)return response({error:'too large'},413);if(!verifyMailEvent(provider,raw,req.headers,cfg()))return response({error:'invalid signature'},401);
 try{const events=normalizeMailEvents(provider,JSON.parse(raw));for(const e of events){
 const messageIds=[e.messageId,e.messageId.replace(/^<|>$/g,''),'<'+e.messageId.replace(/^<|>$/g,'')+'>'];
 const jobs=(await db().prepare('SELECT j.id,j.owner FROM jobs j JOIN records c ON c.id=j.contact_id AND c.owner=j.owner WHERE j.provider=? AND j.provider_id IN (?,?,?) AND lower(json_extract(c.data,\'$.email\'))=?').bind(provider,...messageIds,e.email).all<{id:string;owner:string}>()).results;
 const owners=new Set(jobs.map(j=>j.owner));if(standalone())owners.add(workspace());
 for(const owner of owners){const key=await digest(owner+':'+provider+':'+e.key+':'+e.email);const statements=[db().prepare('INSERT OR IGNORE INTO events(id,created) VALUES(?,?)').bind('mail:'+key,Date.now())];
 if(e.event!=='delivered'){statements.push(db().prepare("INSERT INTO suppressions(id,owner,email,reason,created) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET reason=excluded.reason WHERE suppressions.reason='unsubscribe'").bind(owner+':'+e.email,owner,e.email,e.event,Date.now()));statements.push(db().prepare("UPDATE records SET data=json_set(data,'$.status','unsubscribed'),version=version+1,updated=? WHERE owner=? AND kind='contacts' AND lower(json_extract(data,'$.email'))=? AND json_extract(data,'$.status')!='unsubscribed'").bind(Date.now(),owner,e.email));}
 for(const j of jobs.filter(j=>j.owner===owner))statements.push(db().prepare("UPDATE jobs SET error=? WHERE id=? AND owner=? AND (error IS NULL OR error='配達通知を受信')").bind(e.event==='delivered'?'配達通知を受信':'配信抑止: '+e.event,j.id,owner));await db().batch(statements);
 }
 }return response({ok:true});}catch{return response({error:'processing failed'},500);}
}
