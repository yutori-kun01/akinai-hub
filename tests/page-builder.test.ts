import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blockSchema,imageKey,imageUrl,sniffImage} from '../lib/page-schema.ts';
const id='0f8fad5b-d9cb-469f-a165-70867728950e';
test('blocks saved before rc.3 default to all devices; unknown visibility is rejected',()=>{assert.equal(blockSchema.parse({id:'b',type:'text'}).visibility,'all');assert.equal(blockSchema.parse({id:'b',type:'text',visibility:'mobile'}).visibility,'mobile');assert.equal(blockSchema.safeParse({id:'b',type:'text',visibility:'tablet'}).success,false);});
test('uploaded image URLs pass the block link rules and map only to the owner image prefix',()=>{const url=imageUrl('store',id+'.png');assert.equal(blockSchema.parse({id:'b',type:'image',url}).url,url);assert.equal(imageKey('store',url),'store/images/'+id+'.png');
 for(const bad of [imageUrl('other',id+'.png'),'/api/assets?o=store&image=../secret.pdf','/api/assets?o=store&image='+id+'.svg','/api/assets?o=store&image='+id+'/file.pdf','https://evil.test/api/assets?o=store&image='+id+'.png','/api/download?o=store&image='+id+'.png'])assert.equal(imageKey('store',bad),null,bad);});
test('image uploads are typed by magic bytes, not by name or declared type',()=>{assert.equal(sniffImage(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0])),'image/png');assert.equal(sniffImage(new Uint8Array([0xff,0xd8,0xff,0xe0])),'image/jpeg');assert.equal(sniffImage(new Uint8Array([0x47,0x49,0x46,0x38,0x39,0x61])),'image/gif');assert.equal(sniffImage(new Uint8Array([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50])),'image/webp');assert.equal(sniffImage(new TextEncoder().encode('<svg onload=alert(1)>')),null);assert.equal(sniffImage(new TextEncoder().encode('<html>')),null);});
import {blockSchema as newBlockSchema,pageExtras as extras,blockTypes} from '../lib/page-schema.ts';
import {z as zz} from 'zod';
test('New page elements parse with defaults and keep older blocks valid',()=>{for(const type of blockTypes){const b=newBlockSchema.parse({id:'x',type});assert.equal(b.width,'full');assert.equal(b.sticky,false);}const old=newBlockSchema.parse({id:'o',type:'heading',text:'h',url:'',alt:'',align:'left',tone:'plain'});assert.equal(old.visibility,'all');assert.equal(old.countdownMode,'deadline');assert.equal(newBlockSchema.safeParse({id:'c',type:'text',bg:'red'}).success,false);assert.equal(newBlockSchema.safeParse({id:'c',type:'audio',url:'javascript:alert(1)'}).success,false);assert.equal(newBlockSchema.safeParse({id:'c',type:'progress',value:120}).success,false);});
test('Page settings validate tracking IDs and links',()=>{const p=zz.object(extras);assert.equal(p.safeParse({ga4Id:'G-ABC123XYZ'}).success,true);assert.equal(p.safeParse({ga4Id:"G-1');alert(1)//"}).success,false);assert.equal(p.safeParse({metaPixelId:'12345678901'}).success,true);assert.equal(p.safeParse({metaPixelId:'1;alert(1)'}).success,false);assert.equal(p.safeParse({expiredUrl:'javascript:alert(1)'}).success,false);assert.equal(p.safeParse({ogImage:'/api/assets?o=store&image=x.png'}).success,true);});
import {buildFunnels} from '../lib/funnel-map.ts';
test('funnel map follows next/yes/no links and opt-in tags, without loops',()=>{
 const pages=[{id:'o',pageType:'optin',signupTag:'lead',nextPageId:'t1'},{id:'s',pageType:'sales',nextPageId:'u',bumpProductId:'b',bumpThanksPageId:'t2'},{id:'u',pageType:'upsell',nextPageId:'t1',declinePageId:'d'},{id:'d',pageType:'upsell',nextPageId:'u'},{id:'t1',pageType:'thanks'},{id:'t2',pageType:'thanks'},{id:'v',pageType:'sales',abParentId:'s'},{id:'x',pageType:'thanks'}];
 const {roots,loose}=buildFunnels(pages,[{id:'q',tag:'lead'},{id:'r',tag:'other'}]);
 assert.deepEqual(roots.map(r=>r.page?.id),['o','s']);
 assert.deepEqual(roots[0].children.map(c=>[c.kind,c.node.page?.id||c.node.sequence?.id]),[['tag','q'],['next','t1']]);
 const up=roots[1].children[0];assert.equal(up.node.page?.id,'u');assert.deepEqual(up.node.children.map(c=>[c.kind,c.node.page?.id]),[['yes','t1'],['no','d']]);
 assert.equal(up.node.children[1].node.children.length,0); // d → u would loop back, so it stops
 assert.deepEqual(roots[1].children.map(c=>c.kind),['next','bump']);
 assert.deepEqual(loose.map(p=>p.id),['x']);
});
import {parseChapters} from '../lib/page-schema.ts';
test('video chapters parse m:ss and h:mm:ss lines and ignore the rest',()=>{
 assert.deepEqual(parseChapters('0:00 はじめに\n3:15 本題\nメモ\n1:02:03 まとめ'),[{at:0,title:'はじめに'},{at:195,title:'本題'},{at:3723,title:'まとめ'}]);
 assert.equal(newBlockSchema.parse({id:'x',type:'button'}).action,'link');assert.equal(newBlockSchema.parse({id:'x',type:'text'}).reveal,'always');
});
import {formValues} from '../lib/page-schema.ts';
test('extra form fields are validated and normalised on the server',()=>{
 const fields=[{key:'tel',label:'電話番号',type:'tel',required:true,options:''},{key:'postal',label:'郵便番号',type:'postal',required:false,options:''},{key:'plan',label:'プラン',type:'select',required:false,options:'A\nB'},{key:'ok',label:'同意',type:'checkbox',required:false,options:''}] as any;
 assert.throws(()=>formValues(fields,{}),/電話番号を入力/);assert.throws(()=>formValues(fields,{tel:'abc'}),/電話番号の形式/);assert.throws(()=>formValues(fields,{tel:'03-1234-5678',plan:'C'}),/選択肢/);
 assert.deepEqual(formValues(fields,{tel:' 03-1234-5678 ',postal:'１２３－４５６７',plan:'B',ok:true,extra:'x'}),{tel:'03-1234-5678',postal:'123-4567',plan:'B',ok:'はい'});
 assert.throws(()=>newBlockSchema.parse({id:'x',type:'text'})&&zz.object(extras).parse({formFields:[{key:'a',label:'A'},{key:'a',label:'B'}]}),/重複/);
});
import {webinarSlot} from '../lib/page-schema.ts';
test('auto-webinar finds the live slot (also across midnight) or the next start',()=>{
 const at=(s:string)=>Date.parse(s+'+09:00');
 assert.deepEqual(webinarSlot('12:00,20:00',90,at('2026-10-14T20:30:00')),{state:'live',start:at('2026-10-14T20:00:00'),elapsed:1800});
 assert.deepEqual(webinarSlot('12:00,20:00',90,at('2026-10-14T21:31:00')),{state:'waiting',start:at('2026-10-15T12:00:00'),elapsed:0});
 assert.equal(webinarSlot('23:30',90,at('2026-10-15T00:10:00'))?.state,'live');
 assert.equal(webinarSlot('',60,Date.now()),null);
 assert.throws(()=>newBlockSchema.parse({id:'w',type:'webinar',times:'25:00'}));
});
import {parseVideoMenu,episodeOpen} from '../lib/page-schema.ts';
test('video menu episodes open now, on a date, or N days after the first visit',()=>{
 const m=parseVideoMenu('第1話|https://youtu.be/aaaaaaaaaaa|\n第2話|https://youtu.be/bbbbbbbbbbb|2026-11-01\n第3話|https://youtu.be/ccccccccccc|+3');
 assert.deepEqual(m.map(e=>[e.title,e.date!==null,e.days]),[['第1話',false,null],['第2話',true,null],['第3話',false,3]]);
 const first=Date.parse('2026-10-20T10:00:00+09:00');
 assert.equal(episodeOpen(m[0],first,first),true);assert.equal(episodeOpen(m[1],first,Date.parse('2026-10-31T23:59:00+09:00')),false);assert.equal(episodeOpen(m[1],first,Date.parse('2026-11-01T00:00:00+09:00')),true);
 assert.equal(episodeOpen(m[2],first,first+3*86400000-1),false);assert.equal(episodeOpen(m[2],first,first+3*86400000),true);
 assert.equal(newBlockSchema.parse({id:'s',type:'section',width:'third'}).width,'third');
});
import {exportFunnel,planImport} from '../lib/funnel-map.ts';
test('funnel JSON keeps links by index and imports with fresh slugs',()=>{
 const pages=[{id:'s',slug:'sales',pageType:'sales',nextPageId:'u',productId:'p1',status:'published'},{id:'u',slug:'up',pageType:'upsell',nextPageId:'t',declinePageId:'t'},{id:'t',slug:'thanks',pageType:'thanks'},{id:'x',slug:'other',pageType:'thanks'}];
 const ex=exportFunnel('s',pages,[]);assert.deepEqual(ex.pages.map((p:any)=>[p.slug,p.nextPageId,p.declinePageId,p.productId]),[['sales',1,-1,''],['up',2,2,''],['thanks',-1,-1,'']]);
 const plan=planImport(ex,new Set(['sales','up']));assert.deepEqual(plan.pages.map((p:any)=>p.page.slug),['sales-2','up-2','thanks']);assert.deepEqual(plan.pages[1].links,{nextPageId:2,declinePageId:2,bumpThanksPageId:-1});
 assert.throws(()=>planImport({format:'other'},new Set()),/akinai-funnel-v1/);
});
