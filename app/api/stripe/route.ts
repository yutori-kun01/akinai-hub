import { verifyStripe } from "@/lib/core";
import { cfg,response } from "@/lib/server";
import { handleStripeEvent } from "@/lib/billing";
export async function POST(req:Request){if(!cfg().STRIPE_WEBHOOK_SECRET)return response({error:'not configured'},503);const raw=await req.text();if(raw.length>1000000)return response({error:'too large'},413);if(!await verifyStripe(raw,req.headers.get('stripe-signature')||'',cfg().STRIPE_WEBHOOK_SECRET))return response({error:'invalid signature'},400);try{const r=await handleStripeEvent(JSON.parse(raw));return response(r.body,r.status);}catch(e){return response({error:e instanceof Error&&e.message==='concurrent update'?'concurrent update':'processing failed'},e instanceof Error&&e.message==='concurrent update'?409:500);}}
