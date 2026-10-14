import {ownerOf,response,fail} from '@/lib/server';
import {kpi} from '@/lib/analytics';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const owner=await ownerOf(req);const days=Math.max(0,Math.min(3650,Number(new URL(req.url).searchParams.get('days')||'30')||0));return response({days,families:await kpi(owner,days)});}catch(e){return fail(e);}}
