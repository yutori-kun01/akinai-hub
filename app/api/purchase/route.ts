import {nextPage} from '@/lib/funnel';
import {customerOf,standalone,workspace} from '@/lib/auth';
import {z} from 'zod';
import {db,cfg,list,get,save,makeOrder,input,response,fail} from '@/lib/server';
import {parseJapanDate} from '@/lib/core';
import {checkout,findCoupon,priceOf} from '@/lib/billing';
import {recordConversion,attribution} from '@/lib/analytics';
import {visitorFrom} from '@/lib/ab';
const schema=z.object({owner:z.string().min(1).max(150),pageId:z.string().uuid(),method:z.enum(['bank','card']),consent:z.boolean(),terms:z.literal(true),key:z.string().uuid(),coupon:z.string().trim().max(40).default(''),bump:z.boolean().default(false)});
async function attach(owner:string,order:any,buyer:string,extra:Record<string,unknown>){if(order.buyer&&order.buyer!==buyer)throw Error('注文の所有者が異なります');if(order.buyer)return order;const {id,kind,version,created,updated,...data}=order;Object.assign(data,{buyer,...extra});const r=await db().prepare('UPDATE records SET data=?,updated=?,version=version+1 WHERE owner=? AND id=? AND version=?').bind(JSON.stringify(data),Date.now(),owner,id,version).run();if(!r.meta.changes)throw Error('注文が更新されました。もう一度お試しください');return get(owner,id);}
export async function POST(req:Request){try{const user=await customerOf(req);const buyer=user.userId;if(cfg().COMMERCE_ENABLED!=='true')throw Error('販売開始の準備中です');const b=schema.parse(await input(req));if(standalone()&&b.owner!==workspace())throw Error('店舗がありません');const all=await list(b.owner);const page=all.find(p=>p.id===b.pageId&&p.kind==='pages'&&p.status==='published');if(!page||(page.pageType&&page.pageType!=='sales'))throw Error('受付中のページがありません');const settings=all.find(p=>p.kind==='settings');if(!settings?.legalText||!settings?.privacyText)throw Error('販売条件の準備中です');if(page.deadline&&(!Number.isFinite(parseJapanDate(page.deadline))||parseJapanDate(page.deadline)<Date.now()))throw Error('受付期限を過ぎています');
 const product=all.find(p=>p.id===page.productId&&p.kind==='products');if(!product)throw Error('有効な商品がありません');
 const email=z.string().email().parse(user.email).toLowerCase();let contact=all.find(c=>c.kind==='contacts'&&c.email===email);if(!contact)contact=await save(b.owner,'contacts',{name:email,email,tags:[],consent:b.consent,status:'subscribed',source:'purchase'});
 // Pricing is decided here, never by the browser: coupon discount on the main product, split for installments.
 const coupon=b.coupon?await findCoupon(b.owner,b.coupon,product.id):null;const price=priceOf(product,coupon);const free=price.total===0&&product.billing==='one_time';
 const method=free?'free':b.method;const extra={amount:price.amount,listPrice:price.listPrice,discount:price.discount,...(coupon?{couponId:coupon.id,couponCode:coupon.code}:{}),...(price.installments?{installments:price.installments,paidCount:0}:{}),...(product.trialDays&&product.billing==='subscription'?{trialDays:product.trialDays}:{})};
 const fresh=!(await get(b.owner,b.key));let order=await makeOrder(b.owner,product.id,contact.id,method,b.key,extra);
 // Funnel attribution: which page variant and route led to this order (first request for this key only).
 let touch=null;if(fresh){try{touch=await recordConversion(b.owner,page,'order',visitorFrom(req.headers.get('cookie')),{orderId:order.id,contactId:contact.id});}catch{}}order=await attach(b.owner,order,buyer,{pageId:page.id,termsVersion:settings.version,...(touch?{attribution:attribution(touch)}:{})});
 let bump=null;if(b.bump&&page.bumpProductId&&!free&&product.billing==='one_time'){const bp=all.find(p=>p.id===page.bumpProductId&&p.kind==='products'&&p.status==='active');if(bp){bump=await makeOrder(b.owner,bp.id,contact.id,b.method,b.key+'-bump',{amount:bp.price,listPrice:bp.price,discount:0,bumpOf:order.id});bump=await attach(b.owner,bump,buyer,{pageId:page.id,termsVersion:settings.version});}}
 if(method==='card'&&order.status==='pending_card')return response({url:await checkout(b.owner,order.id,new URL(req.url).origin)});
 return response({url:await nextPage(b.owner,page,'/purchases',order.id,!!bump)});}catch(e){return fail(e);}}
