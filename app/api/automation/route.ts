import {ownerOf,response,fail} from '@/lib/server';
import {runAutomation} from '@/lib/automation';
export async function POST(req:Request){try{const owner=await ownerOf(req);return response(await runAutomation(owner,new URL(req.url).origin));}catch(e){return fail(e);}}
