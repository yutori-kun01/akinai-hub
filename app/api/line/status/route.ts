import {ownerOf,response,fail,cfg} from '@/lib/server';
import {lineStatus} from '@/lib/line';
export async function GET(req:Request){try{await ownerOf(req);return response({...lineStatus(),webhook:(cfg().PUBLIC_ORIGIN||new URL(req.url).origin)+'/api/line/webhook'});}catch(e){return fail(e);}}
