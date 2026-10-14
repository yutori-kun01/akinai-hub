import {z} from 'zod';
import {customerOf,standalone,workspace,limited} from '@/lib/auth';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {list,save,input,response,fail} from '@/lib/server';
import {activePage} from '@/lib/funnel';
// Comments on a published page. Anyone sees approved ones; a signed-in buyer also sees their own pending ones and can post.
const blockOf=async(owner:string,pageId:string,blockId:string)=>{const page=await activePage(owner,pageId);const b=(page.blocks||[]).find((x:any)=>x.id===blockId&&x.type==='comments');if(!b)throw Error('コメント欄がありません');return {page,b};};
export async function GET(req:Request){try{const q=new URL(req.url).searchParams;const owner=q.get('owner')||'';if(standalone()&&owner!==workspace())throw Error('店舗がありません');await blockOf(owner,q.get('page')||'',q.get('block')||'');const u=await getChatGPTUser();
 const rows=(await list(owner,'comments')).filter(c=>c.pageId===q.get('page')&&c.blockId===q.get('block')&&(c.status==='approved'||u&&c.buyer===u.userId&&c.status==='pending')).sort((a,b)=>a.created-b.created).slice(-200);
 return response({comments:rows.map(c=>({id:c.id,name:c.name,body:c.body,created:c.created,pending:c.status==='pending'})),signedIn:!!u});}catch(e){return fail(e);}}
export async function POST(req:Request){try{const u=await customerOf(req);if(!u.email)throw Error('メールの本人確認が必要です');const b=z.object({owner:z.string().max(100),pageId:z.string().max(100),blockId:z.string().max(100),name:z.string().trim().min(1).max(50),body:z.string().trim().min(1).max(1000)}).parse(await input(req));if(standalone()&&b.owner!==workspace())throw Error('店舗がありません');const {b:block}=await blockOf(b.owner,b.pageId,b.blockId);await limited('comment:'+u.userId,5,10);
 const c=await save(b.owner,'comments',{name:b.name,pageId:b.pageId,blockId:b.blockId,body:b.body,status:block.moderate===false?'approved':'pending',buyer:u.userId,email:u.email.toLowerCase()});return response({ok:true,pending:c!.status==='pending'});}catch(e){return fail(e);}}
