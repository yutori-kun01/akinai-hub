import {get,response} from '@/lib/server';
import {standalone,workspace,limited} from '@/lib/auth';
import {visitorFrom} from '@/lib/ab';
import {recordView} from '@/lib/analytics';
// Page-view beacon from the public page. Needs the visitor cookie set by the Worker; counts nothing without it.
export async function POST(req:Request){try{const visitor=visitorFrom(req.headers.get('cookie'));if(!visitor||req.headers.get('origin')!==new URL(req.url).origin)return response({ok:false},202);await limited('view:'+visitor,120,10);const b=await req.json() as Record<string,string>;const owner=String(b.owner||'');if(standalone()&&owner!==workspace())return response({ok:false},202);const page=await get(owner,String(b.pageId||''));if(page?.kind!=='pages'||page.status!=='published')return response({ok:false},202);await recordView(owner,page,visitor,new URLSearchParams(String(b.search||'').slice(0,1000)));return response({ok:true});}catch{return response({ok:false},202);}}
