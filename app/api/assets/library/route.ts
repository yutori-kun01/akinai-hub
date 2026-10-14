import { env } from "cloudflare:workers";
import { z } from "zod";
import { ownerOf,list,response,fail,input,auditStatement } from "@/lib/server";
import { imageName,imageUrl } from "@/lib/page-schema";
// Uploaded page images (R2 <owner>/images/). "used" means some record still points at the image; those cannot be deleted.
async function usage(owner:string){const text=JSON.stringify(await list(owner));return (name:string)=>text.includes('image='+name);}
export async function GET(req:Request){try{const owner=await ownerOf(req);if(!env.BUCKET)throw Error('ストレージが未接続です');const listed=await env.BUCKET.list({prefix:owner+'/images/',limit:500,include:['customMetadata']} as R2ListOptions);const used=await usage(owner);
 const images=listed.objects.map(o=>{const name=o.key.slice((owner+'/images/').length);return {name,url:imageUrl(owner,name),size:o.size,uploaded:o.uploaded.getTime(),filename:o.customMetadata?.filename||name,used:used(name)};}).filter(x=>imageName.test(x.name)).sort((a,b)=>b.uploaded-a.uploaded);return response({images,truncated:listed.truncated});}catch(e){return fail(e);}}
export async function POST(req:Request){try{const owner=await ownerOf(req);if(!env.BUCKET)throw Error('ストレージが未接続です');const b=z.object({action:z.literal('delete'),name:z.string().regex(imageName)}).parse(await input(req));if((await usage(owner))(b.name))throw Error('この画像はページ等で使われています。使っている箇所から外してから削除してください');await env.BUCKET.delete(owner+'/images/'+b.name);await auditStatement(owner,'asset:image-deleted',b.name).run();return response({ok:true});}catch(e){return fail(e);}}
