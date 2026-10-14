import {customerOf} from '@/lib/auth';
import {db,input,response,fail,type Row} from '@/lib/server';
import {checkout} from '@/lib/checkout';
export async function POST(req:Request){try{const u=await customerOf(req);const b=await input(req);const row=await db().prepare("SELECT * FROM records WHERE id=? AND kind='orders' AND json_extract(data,'$.buyer')=?").bind(b.id,u.userId).first<Row>();if(!row)throw Error('注文がありません');return response({url:await checkout(row.owner,row.id,new URL(req.url).origin)});}catch(e){return fail(e);}}
