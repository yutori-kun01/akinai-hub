import {createHmac,createPublicKey,verify,timingSafeEqual} from 'node:crypto';
export type MailEvent={email:string;messageId:string;event:'delivered'|'bounce'|'complaint'|'unsubscribe';key:string};
function same(a:string,b:string){return a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export function verifyMailEvent(provider:string,raw:string,headers:Headers,c:Record<string,string>,now=Date.now()){
 try{
 if(provider==='brevo')return !!c.BREVO_WEBHOOK_TOKEN&&same(headers.get('authorization')||'','Bearer '+c.BREVO_WEBHOOK_TOKEN);
 if(provider==='postmark')return !!c.POSTMARK_WEBHOOK_PASSWORD&&same(headers.get('authorization')||'','Basic '+Buffer.from('commerce:'+c.POSTMARK_WEBHOOK_PASSWORD).toString('base64'));
 if(provider==='resend'){
  const timestamp=headers.get('svix-timestamp')||'',id=headers.get('svix-id')||'';if(!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300||!id||!c.RESEND_WEBHOOK_SECRET)return false;
  const key=Buffer.from(c.RESEND_WEBHOOK_SECRET.replace(/^whsec_/,''),'base64');const signature=createHmac('sha256',key).update(id+'.'+timestamp+'.'+raw).digest('base64');return (headers.get('svix-signature')||'').split(' ').some(x=>same(x,'v1,'+signature));
 }
 if(provider==='mailgun'){
  const s=JSON.parse(raw).signature;if(!s||!c.MAILGUN_WEBHOOK_SIGNING_KEY||!/^\d+$/.test(String(s.timestamp))||Math.abs(now/1000-Number(s.timestamp))>86400||typeof s.token!=='string')return false;return same(createHmac('sha256',c.MAILGUN_WEBHOOK_SIGNING_KEY).update(String(s.timestamp)+s.token).digest('hex'),String(s.signature));
 }
 if(provider==='sendgrid'){
  const timestamp=headers.get('x-twilio-email-event-webhook-timestamp')||'',sig=headers.get('x-twilio-email-event-webhook-signature');if(!c.SENDGRID_WEBHOOK_PUBLIC_KEY||!sig||!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>86400)return false;
  const key=createPublicKey({key:Buffer.from(c.SENDGRID_WEBHOOK_PUBLIC_KEY,'base64'),format:'der',type:'spki'});return verify('sha256',Buffer.from(timestamp+raw),key,Buffer.from(sig,'base64'));
 }
 return false;
 }catch{return false;}
}
export function normalizeMailEvents(provider:string,data:any):MailEvent[]{
 const out:MailEvent[]=[];const add=(email:unknown,id:unknown,event:MailEvent['event'],key:unknown)=>{if(typeof email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&typeof id==='string'&&id)out.push({email:email.toLowerCase(),messageId:id,event,key:String(key||id+':'+event)});};
 for(const d of Array.isArray(data)?data:[data]){
 if(provider==='resend'){const events:Record<string,MailEvent['event']>={'email.delivered':'delivered','email.bounced':'bounce','email.complained':'complaint'};if(events[d.type])for(const email of d.data?.to||[])add(email,d.data?.email_id,events[d.type],d.data?.email_id+':'+d.type);}
 if(provider==='brevo'){const events:Record<string,MailEvent['event']>={delivered:'delivered',hard_bounce:'bounce',hardBounce:'bounce',invalid_email:'bounce',invalid:'bounce',spam:'complaint',unsubscribed:'unsubscribe'};if(events[d.event])add(d.email,d['message-id'],events[d.event],d.id+':'+d.event);}
 if(provider==='postmark'){const event=d.RecordType==='Delivery'?'delivered':d.RecordType==='SpamComplaint'?'complaint':d.RecordType==='Bounce'&&['HardBounce','BadEmailAddress','SpamNotification'].includes(d.Type)?'bounce':d.RecordType==='SubscriptionChange'&&d.SuppressSending?'unsubscribe':null;if(event)add(d.Email||d.Recipient,d.MessageID,event,d.ID||d.MessageID+':'+d.RecordType);}
 if(provider==='mailgun'){const e=d['event-data'];if(e){const event=e.event==='delivered'?'delivered':e.event==='complained'?'complaint':e.event==='unsubscribed'?'unsubscribe':e.event==='failed'&&e.severity==='permanent'?'bounce':null;if(event)add(e.recipient,e.message?.headers?.['message-id'],event,e.id);}}
 if(provider==='sendgrid'){const events:Record<string,MailEvent['event']>={delivered:'delivered',bounce:'bounce',spamreport:'complaint',unsubscribe:'unsubscribe',group_unsubscribe:'unsubscribe'};if(events[d.event])add(d.email,d.sg_message_id?.split('.')[0],events[d.event],d.sg_event_id);}
 }
 return out;
}
