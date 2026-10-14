import {list,response,fail} from '@/lib/server';
import {standalone,workspace} from '@/lib/auth';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {seatsTaken,sessionTimes,calendarUrl,joinOf} from '@/lib/events';
// Public session list for a booking form embedded in a page. Join URLs only for the signed-in reader's own bookings.
export async function GET(req:Request){try{const q=new URL(req.url).searchParams;const owner=q.get('owner')||'';if(standalone()&&owner!==workspace())throw Error('店舗がありません');const event=(await list(owner,'events')).find(e=>e.id===q.get('event')&&e.status==='published');if(!event)throw Error('受付中のイベントがありません');
 const taken=await seatsTaken(owner,event.id);const now=Date.now();const user=await getChatGPTUser();const email=user?.email?.toLowerCase()||'';
 const mine=email?(await list(owner,'bookings')).filter(b=>b.eventId===event.id&&['booked','waiting'].includes(b.status)&&(b.buyer===user!.userId||b.email===email)):[];
 const sessions=[...event.sessions].sort((a:any,b:any)=>a.startsAt.localeCompare(b.startsAt)).map((s:any)=>({id:s.id,startsAt:s.startsAt,minutes:s.minutes,capacity:s.capacity,note:s.note||'',left:Math.max(0,s.capacity-(taken[s.id]||0)),closed:!(sessionTimes(s).start>now)})).filter((s:any)=>!s.closed||mine.some((m:any)=>m.sessionId===s.id));
 return response({eventId:event.id,headline:event.headline,waitlist:!!event.waitlist,loggedEmail:email,sessions,mine:mine.map((m:any)=>{const session=event.sessions.find((s:any)=>s.id===m.sessionId);return {id:m.id,sessionId:m.sessionId,waiting:m.status==='waiting',calendar:m.status==='booked'?calendarUrl(event,session):'',join:m.status==='booked'?joinOf(event,session):''};})});}catch(e){return fail(e);}}
