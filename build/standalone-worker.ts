import handler from 'vinext/server/fetch-handler';
import {scheduledRun} from '../lib/scheduled';
export default {
 async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  if((env as unknown as Record<string,string>).AUTH_MODE!=='standalone')return new Response('Set AUTH_MODE=standalone before starting this distribution.',{status:503});
  const headers=new Headers(request.headers);for(const key of [...headers.keys()])if(key.startsWith('oai-'))headers.delete(key);
  const response=await handler.fetch(new Request(request,{headers}),env,ctx);const out=new Response(response.body,response);out.headers.set('X-Content-Type-Options','nosniff');out.headers.set('Referrer-Policy','same-origin');out.headers.set('X-Frame-Options','DENY');if(!(new URL(request.url).pathname==='/api/assets'&&out.ok&&request.method==='GET'))out.headers.set('Cache-Control','no-store');return out;
 },
 scheduled(_event:ScheduledController,_env:Cloudflare.Env,ctx:ExecutionContext){ctx.waitUntil(scheduledRun());}
};
