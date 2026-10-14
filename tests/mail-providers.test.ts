import test from 'node:test';
import assert from 'node:assert/strict';
import {sendMail,providerStatuses,selectedProvider,sender} from '../lib/mail-providers.ts';
const config={MAIL_FROM:'運営 <hello@example.com>',MAIL_TOKEN_SECRET:'test',RESEND_API_KEY:'r',BREVO_API_KEY:'b',SENDGRID_API_KEY:'s',MAILGUN_API_KEY:'m',MAILGUN_DOMAIN:'mail.example.com',MAILGUN_REGION:'eu',POSTMARK_SERVER_TOKEN:'p',POSTMARK_BROADCAST_STREAM_ID:'broadcast'};
const message={id:'job-1',to:'customer@example.com',subject:'ご案内',text:'本文\n配信停止: https://example.com/unsubscribe',category:'marketing'};
for(const id of ['resend','brevo','sendgrid','mailgun','postmark'] as const){test(id+' accepts documented response and sends one recipient',async()=>{
 let calls=0;
 const mock:typeof fetch=async(url,init)=>{calls++;const h=new Headers(init!.headers);const body=id==='mailgun'?Object.fromEntries((init!.body as FormData).entries()):JSON.parse(init!.body as string);
 assert.equal(init!.redirect,'manual');assert.ok(init!.signal);
 if(id==='resend'){assert.equal(h.get('Idempotency-Key'),'job-1');assert.deepEqual(body.to,[message.to]);assert.equal(body.text,message.text);assert.equal(h.get('Authorization'),'Bearer r');}
 if(id==='brevo'){assert.equal(h.get('api-key'),'b');assert.equal(body.sender.email,'hello@example.com');assert.equal(body.to[0].email,message.to);assert.equal(body.textContent,message.text);}
 if(id==='sendgrid'){assert.equal(body.personalizations[0].to[0].email,message.to);assert.equal(body.content[0].value,message.text);return new Response(null,{status:202});}
 if(id==='mailgun'){assert.equal(url,'https://api.eu.mailgun.net/v3/mail.example.com/messages');assert.equal(h.get('Authorization'),'Basic '+btoa('api:m'));assert.equal(body.to,message.to);assert.equal(body.text,message.text);assert.equal(h.get('Content-Type'),null);}
 if(id==='postmark'){assert.equal(h.get('X-Postmark-Server-Token'),'p');assert.equal(body.MessageStream,'broadcast');assert.equal(body.To,message.to);assert.equal(body.TextBody,message.text);}
 return Response.json(id==='brevo'?{messageId:'accepted'}:id==='postmark'?{MessageID:'accepted',ErrorCode:0}:{id:'accepted'});
 };
 assert.deepEqual(await sendMail(id,config,message,mock),{providerId:id==='sendgrid'?null:'accepted'});assert.equal(calls,1);
});}
test('Postmark transactional stream stays separate',async()=>{await sendMail('postmark',config,{...message,category:'transactional'},async(_,init)=>{assert.equal(JSON.parse(init!.body as string).MessageStream,'outbound');return Response.json({MessageID:'x',ErrorCode:0});});});
test('unsafe or incomplete configuration is rejected before sending',async()=>{let calls=0;const mock:typeof fetch=async()=>{calls++;return Response.json({id:'x'});};for(const [id,c] of [['brevo',{...config,BREVO_API_KEY:''}],['mailgun',{...config,MAILGUN_DOMAIN:'evil.com/path'}],['mailgun',{...config,MAILGUN_REGION:'invalid'}],['postmark',{...config,POSTMARK_BROADCAST_STREAM_ID:'outbound'}]] as const)await assert.rejects(sendMail(id,c,message,mock));assert.equal(calls,0);assert.throws(()=>selectedProvider('invalid'));assert.throws(()=>sender('a@example.com\r\nBcc: b@example.com'));assert.equal(providerStatuses(config).length,5);});
test('provider errors and ambiguous network failures never retry or fall back',async()=>{for(const id of ['resend','brevo','sendgrid','mailgun','postmark'] as const){let calls=0;await assert.rejects(sendMail(id,config,message,async()=>{calls++;return new Response('sensitive provider detail',{status:429});}),e=>e instanceof Error&&!e.message.includes('sensitive'));assert.equal(calls,1);calls=0;await assert.rejects(sendMail(id,config,message,async()=>{calls++;throw new DOMException('Timeout','TimeoutError');}));assert.equal(calls,1);}});
test('Postmark application-level error and malformed success do not become accepted',async()=>{await assert.rejects(sendMail('postmark',config,message,async()=>Response.json({ErrorCode:422,MessageID:'x'})));await assert.rejects(sendMail('brevo',config,message,async()=>Response.json({})));});
