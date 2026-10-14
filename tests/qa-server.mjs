// Local QA server for browser testing: runs the built standalone Worker (dist/server) in Miniflare
// with D1/R2 and mocked mail/LINE/Stripe APIs, serves dist/client, and exposes /__qa/* helpers.
// Usage: pnpm run build:standalone && node tests/qa-server.mjs [port]
// Never point this at real provider keys; every outbound request is answered by the mocks below.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,readdir,stat} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {extname,join,normalize} from 'node:path';
const require=createRequire(import.meta.url);const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const port=Number(process.argv[2]||process.env.QA_PORT||8787),origin='http://localhost:'+port;
const server=new URL('../dist/server/',import.meta.url).pathname,client=new URL('../dist/client/',import.meta.url).pathname;
const files=(await readdir(server,{recursive:true})).filter(f=>/\.m?js$/.test(f));files.sort((a,b)=>a==='index.js'?-1:b==='index.js'?1:a.localeCompare(b));
export const SETUP_TOKEN='a'.repeat(64),LINE_SECRET='line-secret';
const mails=[],lines=[],stripe=[];
const mf=new Miniflare({cf:false,modules:files.map(f=>({type:'ESModule',path:server+f})),modulesRoot:server,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{AUTH_MODE:'standalone',WORKSPACE_ID:'store',ADMIN_EMAIL:'admin@example.com',PUBLIC_ORIGIN:origin,SETUP_TOKEN,AUTH_SECRET:'b'.repeat(64),MAIL_TOKEN_SECRET:'c'.repeat(64),RESEND_API_KEY:'test',MAIL_FROM:'Store <store@example.com>',MAIL_ENABLED:'true',COMMERCE_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_mock',STRIPE_WEBHOOK_SECRET:'whsec_mock',SCHEDULER_SECRET:'scheduler-test',SCHEDULER_OWNER:'store',AUTO_BACKUP_ENABLED:'false',LINE_CHANNEL_ACCESS_TOKEN:'line-test',LINE_CHANNEL_SECRET:LINE_SECRET,LINE_ENABLED:'true'},outboundService:async req=>{
 if(req.url==='https://api.resend.com/emails'){mails.push(await req.json());return Response.json({id:'mail-'+mails.length});}
 if(req.url==='https://api.line.me/v2/bot/message/push'){lines.push(await req.json());return new Response('{}',{headers:{'x-line-request-id':'line-'+lines.length}});}
 if(req.url==='https://api.line.me/v2/bot/message/reply'){lines.push(await req.json());return Response.json({});}
 if(/^https:\/\/api(-data)?\.line\.me\/v2\/bot\/richmenu/.test(req.url)||/^https:\/\/api\.line\.me\/v2\/bot\/user\//.test(req.url)){return Response.json(req.url.endsWith('/richmenu')&&req.method==='POST'?{richMenuId:'richmenu-qa'}:{});}
 if(req.url==='https://api.stripe.com/v1/checkout/sessions'){stripe.push(await req.text());return Response.json({id:'cs_test_qa_'+stripe.length,url:origin+'/__qa/stripe-checkout'});}
 return new Response('QA mock: unexpected outbound '+req.url,{status:599});
}});
const db=await mf.getD1Database('DB');
for(const file of (await readdir(new URL('../drizzle',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())for(const s of (await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8')).split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await db.prepare(s).run();
const types={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.json':'application/json','.ico':'image/x-icon'};
const json=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
createServer(async(req,res)=>{try{
 const url=new URL(req.url,origin);
 if(url.pathname==='/__qa/mails')return json(res,mails);
 if(url.pathname==='/__qa/lines')return json(res,lines);
 if(url.pathname==='/__qa/stripe-checkout'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end('<p>QA mock Stripe Checkout (no charge)</p>');}
 if(url.pathname==='/__qa/line-event'&&req.method==='POST'){// Simulate LINE delivering a signed webhook event to the Worker.
  const chunks=[];for await(const c of req)chunks.push(c);const payload=JSON.stringify({destination:'Uqa',events:[JSON.parse(Buffer.concat(chunks).toString())]});
  const r=await mf.dispatchFetch(origin+'/api/line/webhook',{method:'POST',headers:{'Content-Type':'application/json','x-line-signature':createHmac('sha256',LINE_SECRET).update(payload).digest('base64')},body:payload});return json(res,{status:r.status,body:await r.text()});}
 if(req.method==='GET'&&!url.pathname.startsWith('/api/')){const p=normalize(join(client,decodeURIComponent(url.pathname)));if(p.startsWith(client)&&await stat(p).then(s=>s.isFile(),()=>false)){res.writeHead(200,{'Content-Type':types[extname(p)]||'application/octet-stream'});return res.end(await readFile(p));}}
 const chunks=[];for await(const c of req)chunks.push(c);const headers={};for(const [k,v] of Object.entries(req.headers))if(typeof v==='string')headers[k]=v;
 const r=await mf.dispatchFetch(origin+url.pathname+url.search,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks),redirect:'manual'});
 const out={};r.headers.forEach((v,k)=>{if(k!=='set-cookie'&&k!=='content-encoding'&&k!=='content-length')out[k]=v;});const cookies=r.headers.getSetCookie?.()||[];if(cookies.length)out['set-cookie']=cookies;
 res.writeHead(r.status,out);res.end(Buffer.from(await r.arrayBuffer()));
}catch(e){res.writeHead(500);res.end(String(e?.stack||e));}}).listen(port,'127.0.0.1',()=>console.log('QA server '+origin+' (setup token '+SETUP_TOKEN.slice(0,4)+'…, all providers mocked)'));
process.on('SIGTERM',async()=>{await mf.dispose();process.exit(0);});
