import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');
const root=new URL('../dist/server/',import.meta.url).pathname;const moduleFiles=(await readdir(root,{recursive:true})).filter(f=>/\.m?js$/.test(f));moduleFiles.sort((a,b)=>a==='index.js'?-1:b==='index.js'?1:a.localeCompare(b));
const mf=new Miniflare({modules:moduleFiles.map(f=>({type:'ESModule',path:root+f})),modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET']});
let checks=0;
try{
 const db=await mf.getD1Database('DB');
 for(const file of (await readdir(new URL('../drizzle',import.meta.url))).filter(f=>f.endsWith('.sql')).sort()){
 const sql=await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8');
 for(const statement of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
 }
 async function request(method,body,owner='test_owner',origin='http://localhost'){
 const r=await mf.dispatchFetch('http://localhost/api/hub',{method,headers:{...(owner?{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':'test@example.com'}:{}),Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 return {status:r.status,data:await r.json()};
 }
 assert.equal((await request('GET',null,'')).status,401);checks++;
 assert.equal((await request('POST',{action:'save'},'test_owner','https://evil.invalid')).status,403);checks++;
 const c=await request('POST',{action:'save',kind:'contacts',data:{name:'Test buyer',email:'test@example.com',tags:['course'],consent:false,status:'subscribed',source:'test'}});assert.equal(c.status,200);checks++;
 const p=await request('POST',{action:'save',kind:'products',data:{name:'Test product',description:'fixture',price:128000,status:'active',deliveryKey:'',supportUrl:''}});assert.equal(p.status,200);checks++;
 const key=crypto.randomUUID();
 const o=await request('POST',{action:'order',productId:p.data.id,contactId:c.data.id,method:'bank',key});assert.equal(o.status,200);assert.equal(o.data.amount,128000);checks++;
 const retry=await request('POST',{action:'order',productId:p.data.id,contactId:c.data.id,method:'bank',key});assert.equal(retry.data.id,o.data.id);assert.equal((await request('GET')).data.records.filter(r=>r.kind==='orders').length,1);checks++;
 const denied=await mf.dispatchFetch('http://localhost/api/download?order='+o.data.id,{headers:{'oai-authenticated-user-id':'test_owner'}});assert.equal(denied.status,400);checks++;
 const stranger=await request('POST',{action:'order-state',id:o.data.id,version:o.data.version,transition:'confirm-bank'},'other_owner');assert.notEqual(stranger.status,200);assert.equal((await request('GET',null,'other_owner')).data.records.length,0);checks++;
 const update=await request('POST',{action:'order-state',id:o.data.id,version:o.data.version,transition:'confirm-bank'});assert.equal(update.status,200);checks++;
 const again=await request('POST',{action:'order-state',id:o.data.id,version:o.data.version,transition:'confirm-bank'});assert.notEqual(again.status,200);checks++;
 const campaign=await request('POST',{action:'save',kind:'campaigns',data:{name:'Test',subject:'Subject',body:'Body',tag:'course',scheduledAt:'',status:'ready'}});assert.equal(campaign.status,200);
 const q=await request('POST',{action:'queue',id:campaign.data.id});assert.equal(q.data.count,0);checks++;
 const imported=await request('POST',{action:'import',csv:'name,email,tags,consent,status\nDuplicate,test@example.com,,true,subscribed\nNew,new@example.com,course,true,subscribed'});assert.equal(imported.data.inserted,1);assert.equal(imported.data.skipped,1);checks++;
 const q2=await request('POST',{action:'queue',id:campaign.data.id});assert.equal(q2.data.count,1);await request('POST',{action:'queue',id:campaign.data.id});assert.equal((await request('GET')).data.jobs.length,1);checks++;
 const stale=await request('POST',{action:'save',kind:'products',id:p.data.id,version:0,data:{name:'Changed',description:'',price:1,status:'active',deliveryKey:'',supportUrl:''}});assert.notEqual(stale.status,200);checks++;
 const portal=await mf.dispatchFetch('http://localhost/purchases',{headers:{'oai-authenticated-user-id':'test_owner','oai-authenticated-user-email':'test@example.com'}});assert.equal(portal.status,200);assert.match(await portal.text(),/購入したコンテンツ/);checks++;
 const sequence=await request('POST',{action:'save',kind:'sequences',data:{name:'Follow up',tag:'course',steps:[{delayHours:0,subject:'Step one',body:'Welcome'}]}});assert.equal(sequence.status,200);
 const tick=await mf.dispatchFetch('http://localhost/api/automation',{method:'POST',headers:{'oai-authenticated-user-id':'test_owner',Origin:'http://localhost'}});const tickData=await tick.json();assert.equal(tick.status,200,JSON.stringify(tickData));assert.equal(tickData.sent,0);checks++;
 const before=(await request('GET')).data.jobs.length;
 await mf.dispatchFetch('http://localhost/api/automation',{method:'POST',headers:{'oai-authenticated-user-id':'test_owner',Origin:'http://localhost'}});assert.equal((await request('GET')).data.jobs.length,before);checks++;
 const scheduler=await mf.dispatchFetch('http://localhost/api/scheduler',{method:'POST'});assert.equal(scheduler.status,503);checks++;
 const settings={name:'Settings',fromName:'Team',footer:'Footer',bankInstructions:'',legalText:'',privacyText:'',mailProvider:'brevo'};
 const saved=await request('POST',{action:'save',kind:'settings',data:settings});assert.equal(saved.status,200);const hub=(await request('GET')).data;assert.equal(hub.connections.mailProvider,'brevo');assert.equal(hub.mailProviders.length,5);assert.equal(hub.connections.mailConfigured,false);assert.ok(hub.mailProviders.find(p=>p.id==='brevo').missing.includes('BREVO_API_KEY'));checks++;
 assert.notEqual((await request('POST',{action:'save',kind:'settings',id:saved.data.id,version:saved.data.version,data:{...settings,mailProvider:'unknown'}})).status,200);checks++;
 const disabled=await mf.dispatchFetch('http://localhost/api/mail/process',{method:'POST',headers:{'oai-authenticated-user-id':'test_owner',Origin:'http://localhost'}});assert.equal(disabled.status,400);assert.equal((await request('GET')).data.jobs.filter(j=>j.status==='sent').length,0);checks++;
 console.log(`PASS ${checks} integration checks: auth, origin, persistence, isolation, orders, entitlement, consent, imports, queue idempotency, optimistic lock, purchase page.`);
}finally{await mf.dispose();}
