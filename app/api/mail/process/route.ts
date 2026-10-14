import {ownerOf,response,fail} from '@/lib/server';
import {processMail} from '@/lib/mail';
export async function POST(req:Request){try{const owner=await ownerOf(req);return response(await processMail(owner,new URL(req.url).origin));}catch(e){return fail(e);}}
