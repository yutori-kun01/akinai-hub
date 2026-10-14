import {lineWebhook} from '@/lib/line';
export async function POST(req:Request){try{return await lineWebhook(req);}catch{return new Response('Webhook processing failed',{status:500});}}
