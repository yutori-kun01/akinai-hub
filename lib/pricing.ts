// Pure pricing rules shared by the purchase API, coupon preview and sales page (unit-tested without Worker bindings).
type Item=Record<string,any>;
export const billingLabel=(p:Item)=>p.billing==='subscription'?(p.interval==='year'?'年額':'月額'):p.billing==='installments'?`${p.installmentCount}回払い`:'一括';
export function discountOf(coupon:Item|null,base:number){if(!coupon)return 0;return Math.min(base,coupon.discountType==='percent'?Math.floor(base*coupon.value/100):coupon.value);}
// amount = what one charge costs. For installments the total is split and rounded up per payment.
export function priceOf(product:Item,coupon:Item|null=null){const listPrice=product.price;const discount=discountOf(coupon,listPrice);const total=listPrice-discount;const count=product.billing==='installments'?product.installmentCount:1;const amount=product.billing==='installments'?Math.ceil(total/count):total;return {listPrice,discount,total,amount,installments:product.billing==='installments'?count:0};}
