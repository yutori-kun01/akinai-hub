import {list} from '@/lib/server';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {standalone,workspace} from '@/lib/auth';
import {seatsTaken,sessionTimes,calendarUrl} from '@/lib/events';
import EventBooking from '@/app/event-booking';
export const dynamic='force-dynamic';
// Public booking page. The join URL is shown only to people who hold a booking.
export default async function EventPage({params}:{params:Promise<{owner:string;slug:string}>}){const {owner,slug}=await params;if(standalone()&&owner!==workspace())return <main className="store">ページがありません</main>;
 const event=(await list(owner,'events')).find(e=>e.slug===slug&&e.status==='published');if(!event)return <main className="store"><h1>準備中です</h1></main>;
 const taken=await seatsTaken(owner,event.id);const now=Date.now();const user=await getChatGPTUser();const email=user?.email?.toLowerCase()||'';
 const mine=email?(await list(owner,'bookings')).filter(b=>b.eventId===event.id&&b.status==='booked'&&(b.buyer===user!.userId||b.email===email)):[];
 const sessions=[...event.sessions].sort((a:any,b:any)=>a.startsAt.localeCompare(b.startsAt)).map((s:any)=>({id:s.id,startsAt:s.startsAt,minutes:s.minutes,capacity:s.capacity,note:s.note||'',left:Math.max(0,s.capacity-(taken[s.id]||0)),closed:!(sessionTimes(s).start>now)})).filter((s:any)=>!s.closed||mine.some((m:any)=>m.sessionId===s.id));
 const settings=(await list(owner,'settings'))[0];
 return <main className="store landing ev-page"><header><a className="store-brand" href="/">{settings?.name||'Akinai hub'}</a><a href="/purchases">購入したコンテンツ</a></header><p className="eyebrow">EVENT</p><h1>{event.headline}</h1>{event.location&&<p className="ev-location">場所：{event.location}</p>}<p className="preline">{event.body}</p>
  <EventBooking owner={owner} eventId={event.id} sessions={sessions} loggedEmail={email} mine={mine.map((m:any)=>({id:m.id,sessionId:m.sessionId,calendar:calendarUrl(event,event.sessions.find((s:any)=>s.id===m.sessionId))}))} joinUrl={mine.length?event.joinUrl:''}/>
  {settings?.privacyText&&<details><summary>プライバシーポリシー</summary><p className="preline">{settings.privacyText}</p></details>}</main>;}
