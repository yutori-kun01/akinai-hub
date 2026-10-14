import {list} from '@/lib/server';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {standalone,workspace} from '@/lib/auth';
import {seatsTaken,sessionTimes,calendarUrl,joinOf} from '@/lib/events';
import EventBooking from '@/app/event-booking';
export const dynamic='force-dynamic';
// Public booking page. The join URL is shown only to people who hold a booking.
export default async function EventPage({params}:{params:Promise<{owner:string;slug:string}>}){const {owner,slug}=await params;if(standalone()&&owner!==workspace())return <main className="store">ページがありません</main>;
 const event=(await list(owner,'events')).find(e=>e.slug===slug&&e.status==='published');if(!event)return <main className="store"><h1>準備中です</h1></main>;
 const taken=await seatsTaken(owner,event.id);const now=Date.now();const user=await getChatGPTUser();const email=user?.email?.toLowerCase()||'';
 const mine=email?(await list(owner,'bookings')).filter(b=>b.eventId===event.id&&['booked','waiting'].includes(b.status)&&(b.buyer===user!.userId||b.email===email)):[];
 const sessions=[...event.sessions].sort((a:any,b:any)=>a.startsAt.localeCompare(b.startsAt)).map((s:any)=>({id:s.id,startsAt:s.startsAt,minutes:s.minutes,capacity:s.capacity,note:s.note||'',left:Math.max(0,s.capacity-(taken[s.id]||0)),closed:!(sessionTimes(s).start>now)})).filter((s:any)=>!s.closed||mine.some((m:any)=>m.sessionId===s.id));
 const settings=(await list(owner,'settings'))[0];
 // Paid / buyers-only events point to the product's published sales page.
 const product=event.requireProductId?(await list(owner,'products')).find(p=>p.id===event.requireProductId):null;const salesPage=product?(await list(owner,'pages')).find(p=>p.status==='published'&&(p.pageType||'sales')==='sales'&&p.productId===product.id&&!p.abParentId):null;
 return <main className="store landing ev-page"><header><a className="store-brand" href="/">{settings?.name||'Akinai hub'}</a><a href="/purchases">購入したコンテンツ</a></header><p className="eyebrow">EVENT</p><h1>{event.headline}</h1>{event.location&&<p className="ev-location">場所：{event.location}</p>}<p className="preline">{event.body}</p>{product&&<div className="note-box ev-paid"><div><strong>「{product.name}」をお持ちの方が予約できます</strong><p>{salesPage?<a className="text-btn" href={`/shop/${encodeURIComponent(owner)}/${salesPage.slug}`}>お申し込みはこちら（¥{Number(product.price).toLocaleString('ja-JP')}）</a>:'お申し込み方法は販売者にお問い合わせください。'} 入金の確認後、このページから予約できます。</p></div></div>}
  <EventBooking waitlist={!!event.waitlist} owner={owner} eventId={event.id} sessions={sessions} loggedEmail={email} mine={mine.map((m:any)=>{const session=event.sessions.find((s:any)=>s.id===m.sessionId);return {id:m.id,sessionId:m.sessionId,waiting:m.status==='waiting',calendar:m.status==='booked'?calendarUrl(event,session):'',join:m.status==='booked'?joinOf(event,session):''};})}/>
  {settings?.privacyText&&<details><summary>プライバシーポリシー</summary><p className="preline">{settings.privacyText}</p></details>}</main>;}
