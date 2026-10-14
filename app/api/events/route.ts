import {z} from 'zod';
import {customerOf,standalone,workspace} from '@/lib/auth';
import {get,input,response,fail} from '@/lib/server';
import {book,cancelBooking,ics} from '@/lib/events';
const owns=(b:any,u:{userId:string;email?:string|null})=>b?.kind==='bookings'&&(b.buyer===u.userId||!!u.email&&b.email===u.email.toLowerCase());
// Booking and cancelling by the signed-in buyer (e-mail verified). Calendar file for one's own booking.
export async function POST(req:Request){try{const u=await customerOf(req);if(!u.email)throw Error('メールの本人確認が必要です');const b=z.discriminatedUnion('action',[z.object({action:z.literal('book'),owner:z.string().max(100),eventId:z.string().max(100),sessionId:z.string().max(100),name:z.string().trim().max(200).default('')}),z.object({action:z.literal('cancel'),owner:z.string().max(100),bookingId:z.string().max(100)})]).parse(await input(req));if(standalone()&&b.owner!==workspace())throw Error('店舗がありません');
 if(b.action==='book'){const booking=await book(b.owner,await get(b.owner,b.eventId),b.sessionId,{email:u.email,userId:u.userId},b.name,new URL(req.url).origin);return response({ok:true,id:booking.id});}
 const x=await get(b.owner,b.bookingId);if(!owns(x,u))throw Error('予約が見つかりません');await cancelBooking(b.owner,x,'buyer');return response({ok:true});}catch(e){return fail(e);}}
export async function GET(req:Request){try{const u=await customerOf(req);const q=new URL(req.url).searchParams;const owner=q.get('owner')||'';if(standalone()&&owner!==workspace())throw Error('店舗がありません');const x=await get(owner,q.get('booking')||'');if(!owns(x,u)||x!.status!=='booked')throw Error('予約が見つかりません');const event=await get(owner,x!.eventId);const session=event?.sessions?.find((s:any)=>s.id===x!.sessionId);if(!session)throw Error('日程が見つかりません');return new Response(ics(event,session,x!.id),{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="event.ics"','Cache-Control':'no-store'}});}catch(e){return fail(e);}}
