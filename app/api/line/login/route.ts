import {customerOf} from '@/lib/auth';
import {finishLineLogin} from '@/lib/line-login';
// LINE Login callback: links the signed-in buyer's contact to their LINE user, then returns to the connect page.
export async function GET(req:Request){const u=new URL(req.url);try{const user=await customerOf(req);if(u.searchParams.get('error'))throw Error('LINEログインがキャンセルされました');const next=await finishLineLogin(u.searchParams.get('state')||'',u.searchParams.get('code')||'',user.userId,u.origin);return Response.redirect(u.origin+next,302);}catch(e){return Response.redirect(u.origin+'/line-connect?error='+encodeURIComponent(e instanceof Error?e.message.slice(0,100):'連携できませんでした'),302);}}
