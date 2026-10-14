import handler from 'vinext/server/fetch-handler';
import {scheduledRun} from '../lib/scheduled';
export default {
 async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  if((env as unknown as Record<string,string>).AUTH_MODE!=='standalone')return new Response('Set AUTH_MODE=standalone before starting this distribution.',{status:503});
  const headers=new Headers(request.headers);for(const key of [...headers.keys()])if(key.startsWith('oai-'))headers.delete(key);
  const url=new URL(request.url);const target=url.pathname==='/.well-known/openid-configuration'?url.origin+'/api/oidc/discovery':request.url;
  // Anonymous visitor id for A/B assignment and funnel attribution (first-party, no personal data). Set before rendering so the first view is already sticky.
  let visitorCookie='';if(url.pathname.startsWith('/shop/')&&request.method==='GET'&&!/(?:^|;\s*)akh_v=[a-f0-9]{32}/.test(headers.get('cookie')||'')){const id=Array.from(crypto.getRandomValues(new Uint8Array(16))).map(x=>x.toString(16).padStart(2,'0')).join('');headers.set('cookie',(headers.get('cookie')?headers.get('cookie')+'; ':'')+'akh_v='+id);visitorCookie='akh_v='+id+'; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly'+(url.protocol==='https:'?'; Secure':'');}
  const response=await handler.fetch(new Request(target,new Request(request,{headers})),env,ctx);const out=new Response(response.body,response);out.headers.set('X-Content-Type-Options','nosniff');out.headers.set('Referrer-Policy','same-origin');out.headers.set('X-Frame-Options','DENY');if(visitorCookie)out.headers.append('Set-Cookie',visitorCookie);if(!(new URL(request.url).pathname==='/api/assets'&&out.ok&&request.method==='GET'))out.headers.set('Cache-Control','no-store');return out;
 },
 scheduled(_event:ScheduledController,_env:Cloudflare.Env,ctx:ExecutionContext){ctx.waitUntil(scheduledRun());}
};
