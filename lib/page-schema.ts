import {z} from 'zod';
const safeLink=z.string().max(1500).refine(v=>!v||/^https:\/\/[^\s]+$/.test(v)||/^\/[a-zA-Z0-9][^\s\\]*$/.test(v)||/^#[a-zA-Z][\w-]*$/.test(v),'HTTPSまたはサイト内のリンクを指定してください');
export const blockSchema=z.object({id:z.string().min(1).max(100),type:z.enum(['heading','text','image','video','button','form','countdown','divider','bubble','voice','faq','points']),text:z.string().max(20000).default(''),url:safeLink.default(''),alt:z.string().max(300).default(''),align:z.enum(['left','center']).default('left'),tone:z.enum(['plain','soft','accent']).default('plain'),visibility:z.enum(['all','desktop','mobile']).default('all')});
export const pageExtras={pageType:z.enum(['sales','optin','thanks']).default('sales'),blocks:z.array(blockSchema).max(50).default([]),accent:z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#315EFB'),signupTag:z.string().max(40).default(''),nextPageId:z.string().max(100).default(''),formChannel:z.enum(['email','line']).default('email'),consentText:z.string().min(1).max(500).default('プライバシーポリシーを確認し、メール配信に同意します。')};
export type PageBlock=z.infer<typeof blockSchema>;
// Inline emphasis for page text: **bold** and ==marker==. Returns plain segments; the renderer builds elements, so no HTML is ever parsed.
export type RichSegment={t:'text'|'strong'|'mark';v:string};
export function richSegments(text:string):RichSegment[]{const out:RichSegment[]=[];let last=0;for(const m of text.matchAll(/\*\*([^*\n]+?)\*\*|==([^=\n]+?)==/g)){if(m.index>last)out.push({t:'text',v:text.slice(last,m.index)});out.push(m[1]!==undefined?{t:'strong',v:m[1]}:{t:'mark',v:m[2]});last=m.index+m[0].length;}if(last<text.length)out.push({t:'text',v:text.slice(last)});return out;}
export function plainText(text:string){return richSegments(text).map(s=>s.v).join('');}
// Checklist lines: a leading ❌/✕/× marks a "no" item; ⭕️/○/✓/・ marks are dropped in favour of the list icon.
export function pointItems(text:string){return text.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>({no:/^(❌|✕|×)/u.test(l),text:l.replace(/^(⭕️|⭕|○|◯|✓|✔️|✔|❌|✕|×|・)\s*/u,'')}));}
// FAQ: first line is the question, the rest is the answer.
export function faqParts(text:string){const [q='',...a]=text.split('\n');return {question:q.trim(),answer:a.join('\n').trim()};}
export function videoEmbed(url:string){try{const u=new URL(url);if(u.protocol!=='https:')return null;if(['www.youtube.com','youtube.com','youtu.be'].includes(u.hostname)){const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.match(/^\/embed\/([\w-]+)$/)?.[1];return id&&/^[\w-]{11}$/.test(id)?'https://www.youtube-nocookie.com/embed/'+id:null;}if(u.hostname==='vimeo.com'&&/^\/\d+$/.test(u.pathname))return 'https://player.vimeo.com/video'+u.pathname;}catch{}return null;}
export const imageTypes={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'} as const;
export const imageName=/^[a-f0-9-]{36}\.(?:png|jpg|webp|gif)$/;
export function imageUrl(owner:string,name:string){return '/api/assets?o='+encodeURIComponent(owner)+'&image='+name;}
export function imageKey(owner:string,url:string){try{const u=new URL(url,'https://x.invalid');if(u.origin!=='https://x.invalid'||u.pathname!=='/api/assets'||u.searchParams.get('o')!==owner)return null;const name=u.searchParams.get('image')||'';return imageName.test(name)?owner+'/images/'+name:null;}catch{return null;}}
export function sniffImage(b:Uint8Array){const h=(...x:number[])=>x.every((v,i)=>b[i]===v);return h(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a)?'image/png':h(0xff,0xd8,0xff)?'image/jpeg':h(0x47,0x49,0x46,0x38)?'image/gif':h(0x52,0x49,0x46,0x46)&&b[8]===0x57&&b[9]===0x45&&b[10]===0x42&&b[11]===0x50?'image/webp':null;}
