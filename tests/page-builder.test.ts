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
