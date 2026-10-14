import {db,list,get,save,auditStatement} from './server';
// Affiliate partners. A visit with ?aff=CODE sets a 30-day cookie (last click wins, see build/standalone-worker.ts);
// orders placed meanwhile carry partnerId. Commissions count paid orders only, grouped by the Japan-time month of the
// order, and are frozen into a payout record when the operator approves a finished month. Payment itself is manual.
export const affPattern=/^[a-z0-9_-]{3,30}$/;
export function affFrom(cookie:string|null){const v=cookie?.match(/(?:^|;\s*)akh_aff=([a-z0-9_-]{3,30})(?:;|$)/)?.[1];return v||'';}
export async function partnerFor(owner:string,cookie:string|null,buyerEmail:string){const code=affFrom(cookie);if(!code)return null;const p=(await list(owner,'partners')).find(x=>x.code===code&&x.status==='active');return p&&p.email!==buyerEmail.toLowerCase()?p:null;}
export const monthOf=(t:number)=>new Date(t+9*3600000).toISOString().slice(0,7);
export function commission(p:any,o:any){return p.commissionType==='fixed'?p.value:Math.floor(o.amount*p.value/100);}
export async function partnerReport(owner:string,partnerId?:string){const partners=(await list(owner,'partners')).filter(p=>!partnerId||p.id===partnerId);const orders=(await list(owner,'orders')).filter(o=>o.partnerId&&o.status==='paid');const payouts=(await list(owner,'payouts'));
 const rows:any[]=[];for(const p of partners){const months=new Map<string,any[]>();for(const o of orders.filter(o=>o.partnerId===p.id)){const m=monthOf(o.created);months.set(m,[...(months.get(m)||[]),o]);}for(const po of payouts.filter(x=>x.partnerId===p.id))if(!months.has(po.month))months.set(po.month,[]);
  for(const [month,os] of months){const payout=payouts.find(x=>x.partnerId===p.id&&x.month===month);rows.push({partnerId:p.id,partner:p.name,code:p.code,month,orders:payout?payout.orderIds.length:os.length,sales:os.reduce((n,o)=>n+o.amount,0),commission:payout?payout.amount:os.reduce((n,o)=>n+commission(p,o),0),payout:payout?{id:payout.id,status:payout.status}:null});}}
 return rows.sort((a,b)=>b.month.localeCompare(a.month)||a.partner.localeCompare(b.partner));}
export async function approveMonth(owner:string,partnerId:string,month:string){if(!/^\d{4}-\d{2}$/.test(month)||month>=monthOf(Date.now()))throw Error('承認できるのは終わった月だけです');const p=await get(owner,partnerId);if(p?.kind!=='partners')throw Error('パートナーが見つかりません');
 const lock=await db().prepare('INSERT OR IGNORE INTO system_state(id,data,updated) VALUES(?,?,?)').bind(`payout:${owner}:${partnerId}:${month}`,'{}',Date.now()).run();if(!lock.meta.changes)throw Error('この月はすでに承認済みです');
 try{const os=(await list(owner,'orders')).filter(o=>o.partnerId===partnerId&&o.status==='paid'&&monthOf(o.created)===month);const amount=os.reduce((n,o)=>n+commission(p,o),0);const r=await save(owner,'payouts',{name:`${p.name} ${month}`,partnerId,month,amount,orderIds:os.map(o=>o.id),status:'approved'});await auditStatement(owner,'partner:approved',r.id).run();return r;}catch(e){await db().prepare('DELETE FROM system_state WHERE id=?').bind(`payout:${owner}:${partnerId}:${month}`).run();throw e;}}
export async function markPaid(owner:string,payoutId:string){const x=await get(owner,payoutId);if(x?.kind!=='payouts'||x.status!=='approved')throw Error('承認済みの支払いが見つかりません');return save(owner,'payouts',{...x,status:'paid'},x.id,x.version);}
