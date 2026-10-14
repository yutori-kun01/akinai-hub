export const providerIds = ['resend','brevo','sendgrid','mailgun','postmark'] as const;
export type MailProvider = typeof providerIds[number];
type Config = Record<string,string>;
const labels:Record<MailProvider,string> = {resend:'Resend',brevo:'Brevo',sendgrid:'SendGrid',mailgun:'Mailgun',postmark:'Postmark'};
const keys:Record<MailProvider,string[]> = {resend:['RESEND_API_KEY'],brevo:['BREVO_API_KEY'],sendgrid:['SENDGRID_API_KEY'],mailgun:['MAILGUN_API_KEY','MAILGUN_DOMAIN'],postmark:['POSTMARK_SERVER_TOKEN','POSTMARK_BROADCAST_STREAM_ID']};
export function selectedProvider(value?:string):MailProvider {
 const id=value||'resend'; if(!providerIds.includes(id as MailProvider))throw Error('未対応のメール配信サービスです'); return id as MailProvider;
}
export function sender(value:string,name='') {
 if(/[\r\n]/.test(value+name))throw Error('送信者の形式が不正です');
 const match=value.trim().match(/^(.*?)\s*<([^<>]+)>$/);
 const email=(match?match[2]:value).trim();
 if(!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(email))throw Error('MAIL_FROMに有効な送信元メールアドレスを設定してください');
 return {email,name:match?match[1].trim().replace(/^"|"$/g,''):name};
}
export function providerStatus(id:MailProvider,c:Config) {
 const missing=[...keys[id],'MAIL_FROM','MAIL_TOKEN_SECRET'].filter(k=>!c[k]?.trim());
 const issues:string[]=[];
 if(c.MAIL_FROM)try{sender(c.MAIL_FROM);}catch{issues.push('MAIL_FROMの形式を確認してください');}
 if(id==='mailgun'){
  if(c.MAILGUN_REGION&&!['us','eu'].includes(c.MAILGUN_REGION))issues.push('MAILGUN_REGIONはusまたはeu');
  if(c.MAILGUN_DOMAIN&&!/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(c.MAILGUN_DOMAIN))issues.push('MAILGUN_DOMAINの形式を確認してください');
 }
 if(id==='postmark'&&c.POSTMARK_BROADCAST_STREAM_ID&&(c.POSTMARK_BROADCAST_STREAM_ID===(c.POSTMARK_TRANSACTIONAL_STREAM_ID||'outbound')))issues.push('Postmarkの配信用と取引通知用のストリームを分けてください');
 return {id,label:labels[id],configured:!missing.length&&!issues.length,missing,issues};
}
export function providerStatuses(c:Config){return providerIds.map(id=>providerStatus(id,c));}
export type MailMessage={id:string;to:string;subject:string;text:string;category:string;fromName?:string};
export async function sendMail(id:MailProvider,c:Config,m:MailMessage,request:typeof fetch=fetch):Promise<{providerId:string|null}> {
 const status=providerStatus(id,c); if(!status.configured)throw Error('メール設定が不足しています: '+[...status.missing,...status.issues].join(', '));
 const from=sender(c.MAIL_FROM,m.fromName);
 const formatted=from.name?'"'+from.name.replace(/["\\]/g,'\\$&')+'" <'+from.email+'>':from.email;
 let url='';let body:BodyInit;const headers:Record<string,string>={'Content-Type':'application/json'};
 switch(id){
 case 'resend':url='https://api.resend.com/emails';headers.Authorization='Bearer '+c.RESEND_API_KEY;headers['Idempotency-Key']=m.id;body=JSON.stringify({from:formatted,to:[m.to],subject:m.subject,text:m.text});break;
 case 'brevo':url='https://api.brevo.com/v3/smtp/email';headers['api-key']=c.BREVO_API_KEY;body=JSON.stringify({sender:from,to:[{email:m.to}],subject:m.subject,textContent:m.text});break;
 case 'sendgrid':url='https://api.sendgrid.com/v3/mail/send';headers.Authorization='Bearer '+c.SENDGRID_API_KEY;body=JSON.stringify({from,personalizations:[{to:[{email:m.to}]}],subject:m.subject,content:[{type:'text/plain',value:m.text}]});break;
 case 'mailgun':url='https://'+(c.MAILGUN_REGION==='eu'?'api.eu.mailgun.net':'api.mailgun.net')+'/v3/'+c.MAILGUN_DOMAIN+'/messages';headers.Authorization='Basic '+btoa('api:'+c.MAILGUN_API_KEY);delete headers['Content-Type'];{const form=new FormData();for(const [k,v] of Object.entries({from:formatted,to:m.to,subject:m.subject,text:m.text}))form.set(k,v);body=form;}break;
 case 'postmark':url='https://api.postmarkapp.com/email';headers['X-Postmark-Server-Token']=c.POSTMARK_SERVER_TOKEN;headers.Accept='application/json';body=JSON.stringify({From:formatted,To:m.to,Subject:m.subject,TextBody:m.text,MessageStream:m.category==='transactional'?(c.POSTMARK_TRANSACTIONAL_STREAM_ID||'outbound'):c.POSTMARK_BROADCAST_STREAM_ID});break;
 }
 // A timeout can occur after acceptance. Never retry or switch providers here.
 const response=await request(url,{method:'POST',headers,body,signal:AbortSignal.timeout(15000),redirect:'manual'});
 if(!response.ok)throw Error('メールAPIがリクエストを拒否しました（HTTP '+response.status+'）');
 if(id==='sendgrid'){
  if(response.status!==202)throw Error('メールAPIの応答を確認してください');
  return {providerId:response.headers.get('x-message-id')};
 }
 const data=await response.json() as Record<string,unknown>;
 if(id==='postmark'&&data.ErrorCode!==0)throw Error('メールAPIの応答を確認してください');
 const providerId=id==='brevo'?data.messageId:id==='postmark'?data.MessageID:data.id;
 if(typeof providerId!=='string'||!providerId)throw Error('メールAPIの受付番号を確認してください');
 return {providerId};
}
