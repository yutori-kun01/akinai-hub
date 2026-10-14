import {z} from 'zod';
import {customerOf,standalone,workspace} from '@/lib/auth';
import {db,get,makeOrder,input,response,fail,type Row,unpack} from '@/lib/server';
import {activePage,nextPage} from '@/lib/funnel';
import {chargeUpsell,stripeReady} from '@/lib/billing';
// Upsell page: "yes" buys the page's product with the card used for the order just placed; "no" moves on.
export async function POST(req:Request){try{const user=await customerOf(req);const b=z.object({owner:z.string().max(150),pageId:z.string().uuid(),parentId:z.string().max(100),key:z.string().uuid(),accept:z.boolean()}).parse(await input(req));if(standalone()&&b.owner!==workspace())throw Error('店舗がありません');const page=await activePage(b.owner,b.pageId,'upsell');
 const row=await db().prepare("SELECT * FROM records WHERE owner=? AND id=? AND kind='orders' AND json_extract(data,'$.buyer')=?").bind(b.owner,b.parentId,user.userId).first<Row>();if(!row)throw Error('元のご注文が見つかりません');const parent=unpack(row);if(!['paid','pending_card','pending_bank'].includes(parent.status))throw Error('元のご注文の状態を確認できません');
 if(!b.accept)return response({url:await nextPage(b.owner,page,'/purchases',parent.id,false,'declinePageId')});
 const product=await get(b.owner,page.productId);if(product?.kind!=='products'||product.status!=='active')throw Error('この商品は現在お申し込みいただけません');const card=parent.method==='card'&&stripeReady();
 let order=await makeOrder(b.owner,product.id,parent.contactId,card?'card':'bank',b.key,{amount:product.price,listPrice:product.price,discount:0,upsellOf:parent.id,...(parent.partnerId?{partnerId:parent.partnerId}:{})});
 if(order.buyer&&order.buyer!==user.userId)throw Error('注文の所有者が異なります');if(!order.buyer){const {id,kind,version,created,updated,...data}=order;Object.assign(data,{buyer:user.userId,pageId:page.id});const r=await db().prepare('UPDATE records SET data=?,updated=?,version=version+1 WHERE owner=? AND id=? AND version=?').bind(JSON.stringify(data),Date.now(),b.owner,id,version).run();if(!r.meta.changes)throw Error('注文が更新されました。もう一度お試しください');order=await get(b.owner,id);}
 const thanks=await nextPage(b.owner,page,'/purchases',order.id);if(order.status!=='pending_card')return response({url:thanks});
 return response(await chargeUpsell(b.owner,order,parent,new URL(req.url).origin,thanks));}catch(e){return fail(e);}}
