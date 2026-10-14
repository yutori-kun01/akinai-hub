import {ownerOf,input,response,fail} from '@/lib/server';
import {publishRichMenu,unpublishRichMenu,syncRichMenuLinks} from '@/lib/line-richmenu';
import {lineStatus} from '@/lib/line';
export async function POST(req:Request){try{const owner=await ownerOf(req);const b=await input(req);if(!lineStatus().configured)throw Error('LINEの接続情報が未設定です');
 if(b.action==='publish'){const id=await publishRichMenu(owner,String(b.id||''));const linked=await syncRichMenuLinks(owner);return response({ok:true,richMenuId:id,linked});}
 if(b.action==='unpublish'){await unpublishRichMenu(owner,String(b.id||''));return response({ok:true,linked:await syncRichMenuLinks(owner)});}
 throw Error('未対応の操作です');}catch(e){return fail(e);}}
