// Pure pricing rules shared by the purchase API, coupon preview and sales page (unit-tested without Worker bindings).
type Item=Record<string,any>;
export const billingLabel=(p:Item)=>p.billing==='subscription'?(p.interval==='year'?'年額':'月額'):p.billing==='installments'?`${p.installmentCount}回払い`:'一括';
export function discountOf(coupon:Item|null,base:number){if(!coupon)return 0;return Math.min(base,coupon.discountType==='percent'?Math.floor(base*coupon.value/100):coupon.value);}
// amount = what one charge costs. For installments the total is split and rounded up per payment.
export function priceOf(product:Item,coupon:Item|null=null){const listPrice=product.price;const discount=discountOf(coupon,listPrice);const total=listPrice-discount;const count=product.billing==='installments'?product.installmentCount:1;const amount=product.billing==='installments'?Math.ceil(total/count):total;return {listPrice,discount,total,amount,installments:product.billing==='installments'?count:0};}
// The product as bought with one price option (or the base price when optionId is empty).
export function withOption(product:Item,optionId=''){if(!optionId)return product;const o=(product.options||[]).find((x:Item)=>x.id===optionId);if(!o)throw Error('価格の選択が見つかりません');return {...product,price:o.price,billing:o.billing,interval:o.interval,installmentCount:o.installmentCount,trialDays:o.trialDays,optionId:o.id,optionLabel:o.label};}
// Every way to buy a product, base price first, for the sales form.
export function lineup(product:Item){return [{id:'',label:product.priceLabel||'通常価格',price:product.price,billing:product.billing||'one_time',interval:product.interval||'month',installmentCount:product.installmentCount||3,trialDays:product.trialDays||0},...(product.options||[])];}
