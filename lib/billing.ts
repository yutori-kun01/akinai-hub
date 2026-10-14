import {db,cfg,get,list,auditStatement,type Row,unpack} from './server';
import {notifyAdmin} from './notify';
import {nextPage} from './funnel';
import {parseJapanDate} from './core';
// Card payments through Stripe: one-time Checkout (card saved for a one-click upsell), subscriptions, fixed-count
// installments, order bumps on the same Checkout, coupons, and the webhook that turns Stripe's facts into order states.
// Order states stay as before (pending_card → paid → revoked); billingStatus adds active / past_due / completed / canceled.
type Item=Record<string,any>;
export function stripeReady(){return !!cfg().STRIPE_SECRET_KEY&&cfg().COMMERCE_ENABLED==='true';}
export async function stripe(path:string,params?:URLSearchParams,opts:{method?:string;idempotency?:string}={}){const res=await fetch('https://api.stripe.com/v1/'+path,{method:opts.method||(params?'POST':'GET'),headers:{Authorization:'Bearer '+cfg().STRIPE_SECRET_KEY,...(params?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(opts.idempotency?{'Idempotency-Key':opts.idempotency}:{})},body:params});const data=await res.json() as Item;if(!res.ok){const e=Error(data?.error?.message||'Stripeの処理に失敗しました') as Error&{code?:string;status?:number};e.code=data?.error?.code;e.status=res.status;throw e;}return data;}
// ---------- Pricing ----------
export {billingLabel,discountOf,priceOf} from './pricing';
export async function findCoupon(owner:string,code:string,productId:string){const c=(await list(owner,'coupons')).find(x=>x.code===code.trim().toUpperCase());const now=Date.now();
 if(!c||c.status!=='active')throw Error('クーポンコードが見つかりません');if(c.productIds.length&&!c.productIds.includes(productId))throw Error('このクーポンは対象外の商品です');if(c.startsAt&&parseJapanDate(c.startsAt)>now)throw Error('クーポンの利用期間前です');if(c.endsAt&&parseJapanDate(c.endsAt)<=now)throw Error('クーポンの利用期限を過ぎています');
 if(c.maxUses){const used=(await db().prepare("SELECT COUNT(*) AS n FROM records WHERE owner=? AND kind='orders' AND json_extract(data,'$.couponId')=? AND json_extract(data,'$.status') NOT IN ('cancelled')").bind(owner,c.id).first<{n:number}>())?.n||0;if(used>=c.maxUses)throw Error('クーポンの利用上限に達しています');}
 return c;}
// ---------- Checkout ----------
async function setSession(owner:string,o:Item,sessionId:string){const {id,kind,version,created,updated,...data}=o;data.sessionId=sessionId;const r=await db().prepare('UPDATE records SET data=?,version=version+1,updated=? WHERE owner=? AND id=? AND version=?').bind(JSON.stringify(data),Date.now(),owner,id,version).run();if(!r.meta.changes){const latest=await get(owner,id);if(latest?.sessionId!==sessionId)throw Error('注文状態を再確認してください');}}
// One Checkout Session for the main order plus its pending bump orders. Returns the Stripe-hosted URL.
export async function checkout(owner:string,id:string,origin:string){if(!stripeReady())throw Error('カード決済は準備中です');const o=await get(owner,id);if(o?.kind!=='orders'||o.status!=='pending_card')throw Error('決済待ちの注文がありません');const c=await get(owner,o.contactId);const product=await get(owner,o.productId);
 const bumps=o.billing==='one_time'||!o.billing?(await list(owner,'orders')).filter(b=>b.bumpOf===o.id&&b.status==='pending_card'):[];const orders=[o,...bumps];
 const page=o.pageId?await get(owner,o.pageId):null;const success=origin+(await nextPage(owner,page,'/purchases',o.id,bumps.length>0));
 const body=new URLSearchParams({customer_email:c.email,success_url:success,cancel_url:origin+'/purchases','metadata[order_id]':o.id,'metadata[order_ids]':orders.map(x=>x.id).join(','),'metadata[owner]':owner,locale:'ja'});
 orders.forEach((x,i)=>{body.set(`line_items[${i}][price_data][currency]`,'jpy');body.set(`line_items[${i}][price_data][unit_amount]`,String(x.amount));body.set(`line_items[${i}][price_data][product_data][name]`,x.productName);body.set(`line_items[${i}][quantity]`,'1');});
 if(o.billing==='subscription'||o.billing==='installments'){body.set('mode','subscription');body.set('line_items[0][price_data][recurring][interval]',o.billing==='installments'?'month':(product?.interval||'month'));if(o.billing==='installments')body.set('line_items[0][price_data][product_data][name]',`${o.productName}（${o.installments}回払い）`);if(o.trialDays)body.set('subscription_data[trial_period_days]',String(o.trialDays));body.set('subscription_data[metadata][order_id]',o.id);body.set('subscription_data[metadata][owner]',owner);}
 else{body.set('mode','payment');body.set('customer_creation','always');body.set('payment_intent_data[setup_future_usage]','off_session');body.set('payment_intent_data[metadata][order_id]',o.id);body.set('payment_intent_data[metadata][owner]',owner);}
 const session=await stripe('checkout/sessions',body,{idempotency:orders.map(x=>x.id).join(':')});if(!session.id||!session.url)throw Error('決済セッションを作成できませんでした');for(const x of orders)await setSession(owner,x,session.id);return session.url as string;}
// ---------- Webhook ----------
async function update(owner:string,o:Item,change:Item,action:string){const {id,kind,version,created,updated,...data}=o;Object.assign(data,change);const r=await db().prepare('UPDATE records SET data=?,version=version+1,updated=? WHERE owner=? AND id=? AND version=?').bind(JSON.stringify(data),Date.now(),owner,id,version).run();if(!r.meta.changes)throw Error('concurrent update');await auditStatement(owner,action,id).run();}
async function orderBySubscription(subscriptionId:string){const row=await db().prepare("SELECT * FROM records WHERE kind='orders' AND json_extract(data,'$.subscriptionId')=? LIMIT 1").bind(subscriptionId).first<Row>();return row?{owner:row.owner,order:unpack(row)}:null;}
const subscriptionOfInvoice=(inv:Item)=>typeof inv.subscription==='string'?inv.subscription:inv.subscription?.id||inv.parent?.subscription_details?.subscription||inv.lines?.data?.[0]?.parent?.subscription_item_details?.subscription||null;
export type StripeResult={status:number;body:Item};
// Every branch is idempotent: Stripe redelivers until it gets a 2xx, and events can arrive in any order.
export async function handleStripeEvent(event:Item):Promise<StripeResult>{const ok={status:200,body:{ok:true}};const o=event.data?.object||{};
 if(await db().prepare('SELECT id FROM events WHERE id=?').bind(event.id).first())return ok;
 const done=async()=>{await db().prepare('INSERT OR IGNORE INTO events(id,created) VALUES(?,?)').bind(event.id,Date.now()).run();return ok;};
 if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){const owner=o.metadata?.owner;const ids=String(o.metadata?.order_ids||o.metadata?.order_id||'').split(',').filter(Boolean);if(!owner||!ids.length)return {status:400,body:{error:'missing order'}};
  const orders=await Promise.all(ids.map(id=>get(owner,id)));if(orders.some(x=>!x||x.kind!=='orders'||x.method!=='card'||x.sessionId!==o.id)||o.currency!=='jpy')return {status:400,body:{error:'order mismatch'}};
  if(o.mode==='subscription'){if(o.status!=='complete'||!['paid','no_payment_required'].includes(o.payment_status))return ok;const main=orders[0]!;if(main.status==='paid'&&main.subscriptionId)return done();if(main.status!=='pending_card'&&main.status!=='paid')return {status:409,body:{error:'invalid state'}};await update(owner,main,{status:'paid',subscriptionId:typeof o.subscription==='string'?o.subscription:o.subscription?.id,customerId:typeof o.customer==='string'?o.customer:o.customer?.id||null,billingStatus:'active',paidCount:main.paidCount||0},'stripe:subscribed');return done();}
  if(o.payment_status!=='paid')return ok;if(orders.reduce((s,x)=>s+x!.amount,0)!==o.amount_total)return {status:400,body:{error:'order mismatch'}};
  for(const x of orders){if(x!.status==='paid')continue;if(x!.status!=='pending_card')return {status:409,body:{error:'invalid state'}};await update(owner,x!,{status:'paid',paymentIntentId:typeof o.payment_intent==='string'?o.payment_intent:o.payment_intent?.id||null,customerId:typeof o.customer==='string'?o.customer:o.customer?.id||null},'stripe:paid');}
  return done();}
 if(event.type==='payment_intent.succeeded'&&o.metadata?.kind==='upsell'){const owner=o.metadata.owner,id=o.metadata.order_id;const x=owner&&id?await get(owner,id):null;if(!x||x.kind!=='orders'||x.amount!==o.amount||o.currency!=='jpy')return {status:400,body:{error:'order mismatch'}};if(x.status==='pending_card')await update(owner,x,{status:'paid',paymentIntentId:o.id},'stripe:upsell-paid');return done();}
 if(event.type==='invoice.paid'){const sub=subscriptionOfInvoice(o);const found=sub?await orderBySubscription(sub):null;if(!found)return done();const x=found.order;if(!(o.amount_paid>0))return done();const paidCount=(x.paidCount||0)+1;const completed=x.billing==='installments'&&paidCount>=x.installments;
  if(completed&&x.billingStatus!=='completed')await stripe('subscriptions/'+sub,new URLSearchParams({cancel_at_period_end:'true'}),{idempotency:'complete:'+sub});
  await update(found.owner,x,{paidCount,billingStatus:completed?'completed':'active',...(x.status==='pending_card'?{status:'paid'}:{}),periodEnd:o.period_end?o.period_end*1000:x.periodEnd||null},'stripe:invoice-paid');return done();}
 if(event.type==='invoice.payment_failed'){const sub=subscriptionOfInvoice(o);const found=sub?await orderBySubscription(sub):null;if(found&&found.order.billingStatus!=='completed'){const x=found.order;await update(found.owner,x,{billingStatus:'past_due'},'stripe:payment-failed');await notifyAdmin(found.owner,'payment-failed:'+(o.id||sub),'継続課金の支払いに失敗しました｜'+x.productName,`${x.productName}（注文番号 ${x.id}）の${x.billing==='installments'?'分割払い':'継続課金'}で、カードの請求に失敗しました。\nStripeが設定に従って再請求します。購入者にカード情報の更新を案内してください。\n請求の状態はStripeのダッシュボードで確認できます。`);}return done();}
 if(event.type==='customer.subscription.deleted'){const found=await orderBySubscription(o.id);if(found&&found.order.billingStatus!=='completed'&&found.order.status==='paid')await update(found.owner,found.order,{status:'revoked',billingStatus:'canceled'},'stripe:subscription-ended');return done();}
 return ok;}
// ---------- One-click upsell ----------
// Charges the card saved by the first Checkout without asking again. If the bank asks for authentication, falls back
// to a normal Checkout for this order. Called only for the buyer who owns the parent order.
export async function chargeUpsell(owner:string,order:Item,parent:Item,origin:string,thanks:string){let pi:Item|null=null;
 if(parent.paymentIntentId)pi=await stripe('payment_intents/'+parent.paymentIntentId);else if(parent.sessionId){const s=await stripe('checkout/sessions/'+parent.sessionId+'?expand[]=payment_intent');if(s.payment_status!=='paid')throw Error('前のお支払いの完了を確認できません。少し待ってから再度お試しください');pi=s.payment_intent;}
 const pm=typeof pi?.payment_method==='string'?pi.payment_method:pi?.payment_method?.id;const customer=typeof pi?.customer==='string'?pi.customer:pi?.customer?.id;if(!pm||!customer)return {url:await checkout(owner,order.id,origin)};
 try{const r=await stripe('payment_intents',new URLSearchParams({amount:String(order.amount),currency:'jpy',customer,payment_method:pm,off_session:'true',confirm:'true',description:order.productName,'metadata[order_id]':order.id,'metadata[owner]':owner,'metadata[kind]':'upsell'}),{idempotency:'upsell:'+order.id});
  if(r.status==='succeeded'){const latest=await get(owner,order.id);if(latest?.status==='pending_card')await update(owner,latest,{status:'paid',paymentIntentId:r.id,customerId:customer},'stripe:upsell-paid');return {url:thanks};}
 }catch(e){const code=(e as {code?:string}).code;if(code!=='authentication_required'&&code!=='card_declined')throw e;}
 return {url:await checkout(owner,order.id,origin)};}
export async function cancelSubscription(subscriptionId:string,atPeriodEnd:boolean){return atPeriodEnd?stripe('subscriptions/'+subscriptionId,new URLSearchParams({cancel_at_period_end:'true'})):stripe('subscriptions/'+subscriptionId,undefined,{method:'DELETE'});}
