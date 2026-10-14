import {test} from 'node:test';
import assert from 'node:assert/strict';
import {schemas,parseCSV,csvCell,transitionOrder,verifyStripe,parseJapanDate} from '../lib/core.ts';
test('CSV respects quoted commas, escaped quotes, multiline and CRLF',()=>{assert.deepEqual(parseCSV('name,email\r\n"a,b","x@example.com"\r\n"a""b","line1\nline2"'),[['name','email'],['a,b','x@example.com'],['a"b','line1\nline2']]);assert.throws(()=>parseCSV('"unclosed'));});
test('CSV spreadsheet formula injection is neutralized',()=>{for(const s of ['=WEBSERVICE("x")','+SUM(1)','@A1','-2','\t=1'])assert.ok(csvCell(s).startsWith('"\''));});
test('Payment transitions reject unpaid delivery and duplicate confirmation',()=>{assert.equal(transitionOrder('pending_bank','confirm-bank'),'paid');assert.equal(transitionOrder('paid','revoke'),'revoked');assert.throws(()=>transitionOrder('pending_card','confirm-bank'));assert.throws(()=>transitionOrder('paid','confirm-bank'));assert.throws(()=>transitionOrder('revoked','confirm-bank'));});
test('Invalid prices, contact consent types, and unsafe slugs are rejected',()=>{assert.equal(schemas.products.safeParse({name:'x',description:'',price:-1,status:'active'}).success,false);assert.equal(schemas.contacts.safeParse({name:'x',email:'not-email',tags:[],consent:true,status:'subscribed'}).success,false);assert.equal(schemas.pages.safeParse({name:'x',slug:'../admin',headline:'x',body:'',productId:'',status:'published'}).success,false);});
test('Schedule without offset is interpreted as JST',()=>{assert.equal(parseJapanDate('2026-10-13T22:30'),Date.parse('2026-10-13T13:30:00Z'));});
test('Webhook accepts valid HMAC and rejects tamper, expiry, absent signatures',async()=>{const now=Date.now();const t=Math.floor(now/1000);const raw=JSON.stringify({id:'evt_test'});const secret='test_only';const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(t+'.'+raw))).toString('hex');assert.equal(await verifyStripe(raw,`t=${t},v1=${sig}`,secret,now),true);assert.equal(await verifyStripe(raw+' ',`t=${t},v1=${sig}`,secret,now),false);assert.equal(await verifyStripe(raw,`t=${t},v1=${sig}`,secret,now+301000),false);assert.equal(await verifyStripe(raw,'',secret,now),false);});
import {stepDue} from '../lib/core.ts';
test('fixed-time steps land on the Japan-time day and roll over when the time has passed',()=>{
 const start=Date.parse('2026-10-14T10:30:00+09:00');
 assert.equal(stepDue(start,{delayHours:5}),start+5*3600000);
 assert.equal(new Date(stepDue(start,{delayHours:0,atTime:'20:00'})).toISOString(),'2026-10-14T11:00:00.000Z');
 assert.equal(new Date(stepDue(start,{delayHours:0,atTime:'09:00'})).toISOString(),'2026-10-15T00:00:00.000Z');
 assert.equal(new Date(stepDue(start,{delayHours:72,atTime:'20:00'})).toISOString(),'2026-10-17T11:00:00.000Z');
 assert.equal(new Date(stepDue(Date.parse('2026-10-14T23:30:00+09:00'),{delayHours:24,atTime:'07:00'})).toISOString(),'2026-10-14T22:00:00.000Z');
});
import {abWinner,abBucket} from '../lib/core.ts';
test('A/B winner by open or click rate, tie keeps A; buckets are stable',()=>{
 const s=[{variant:'A',sent:10,opened:3,clicked:2},{variant:'B',sent:10,opened:5,clicked:1}];
 assert.equal(abWinner(s,'open'),'B');assert.equal(abWinner(s,'click'),'A');assert.equal(abWinner([{variant:'A',sent:4,opened:2,clicked:0},{variant:'B',sent:2,opened:1,clicked:0}],'open'),'A');
 assert.equal(abBucket('x'),abBucket('x'));assert.ok(abBucket('y')>=0&&abBucket('y')<100);
});
import {withOption,lineup,priceOf as price2} from '../lib/pricing.ts';
test('price options override price and billing; lineup lists the base first',()=>{
 const p={name:'X',price:30000,billing:'one_time',options:[{id:'six',label:'6回',price:36000,billing:'installments',interval:'month',installmentCount:6,trialDays:0}]};
 const v=withOption(p,'six');assert.equal(price2(v).amount,6000);assert.equal(v.optionLabel,'6回');assert.equal(withOption(p,''),p);assert.throws(()=>withOption(p,'x'));
 assert.deepEqual(lineup(p).map((o:any)=>[o.id,o.label]),[['','通常価格'],['six','6回']]);
});
