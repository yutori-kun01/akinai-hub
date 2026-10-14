// Pure helpers for HTML mail: block rendering with inline styles (mail clients ignore <style>), merge tags,
// click/open tracking rewrites and a plain-text fallback. No Worker bindings, so node tests import it directly.
import {inlineParts,type PageBlock} from './page-schema.ts';
export const mailBlockTypes=['heading','text','image','button','divider','spacer'] as const;
export const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const safeUrl=(u:string)=>/^https:\/\/[^\s"'<>]+$/.test(u)||/^\/[a-zA-Z0-9][^\s"'<>\\]*$/.test(u)?u:'';
// Text blocks keep line breaks and turn bare https links into anchors so they can be tracked.
// Same inline formatting as pages (**bold**, __underline__, [label](url), bare https links); every piece is escaped.
const paragraph=(text:string)=>inlineParts(text).map(p=>p.t==='b'?`<strong>${esc(p.s)}</strong>`:p.t==='u'?`<u>${esc(p.s)}</u>`:p.t==='a'&&p.href!.startsWith('https://')?`<a href="${esc(p.href!)}" style="color:inherit">${esc(p.s)}</a>`:esc(p.s)).join('').replace(/\r?\n/g,'<br>');
export function renderMailBlocks(blocks:Pick<PageBlock,'type'|'text'|'url'|'alt'|'align'|'tone'>[],accent='#315EFB'){
 const color=/^#[0-9a-fA-F]{6}$/.test(accent)?accent:'#315EFB';
 const rows=blocks.map(b=>{const align=b.align==='center'?'center':'left';const bg=b.tone==='soft'?'#f4f6fb':b.tone==='accent'?color:'#ffffff';const fg=b.tone==='accent'?'#ffffff':'#18243A';const cell=(inner:string,pad='12px 24px')=>`<tr><td style="padding:${pad};background:${bg};color:${fg};text-align:${align};font-size:16px;line-height:1.8">${inner}</td></tr>`;
  switch(b.type){
   case 'heading':return cell(`<h2 style="margin:0;font-size:22px;line-height:1.4;color:${fg}">${esc(b.text)}</h2>`,'20px 24px 8px');
   case 'text':return cell(paragraph(b.text));
   case 'image':{const src=safeUrl(b.url);return src?cell(`<img src="${esc(src)}" alt="${esc(b.alt)}" width="552" style="display:block;${align==='center'?'margin:0 auto;':''}max-width:100%;height:auto;border:0">`):'';}
   case 'button':{const href=safeUrl(b.url);return href?cell(`<a href="${esc(href)}" style="display:inline-block;padding:14px 28px;border-radius:8px;background:${b.tone==='accent'?'#ffffff':color};color:${b.tone==='accent'?color:'#ffffff'};font-weight:bold;text-decoration:none">${esc(b.text||'詳しく見る')}</a>`,'16px 24px'):'';}
   case 'divider':return cell('<hr style="border:0;border-top:1px solid #dfe3ec;margin:0">');
   case 'spacer':return `<tr><td style="height:24px;background:${bg}"></td></tr>`;
   default:return '';}}).join('');
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0;padding:0;background:#f4f6fb"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb"><tr><td align="center" style="padding:24px 8px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',Meiryo,sans-serif">${rows}</table></td></tr></table></body></html>`;}
// Merge tags: {{name}} / {{email}} and the UTAGE-style %name% / %mail% so migrated copy keeps working. HTML values are escaped.
// Conditional parts (UTAGE's 本文の条件分岐): {{#if tag:vip}}…{{else}}…{{/if}}, {{#if field:pref=東京都}}…{{/if}}; one level, no nesting.
// Form answers can be inserted with {{field:key}}.
export function mergeTags(input:string,vars:{name:string;email:string;tags?:string[];fields?:Record<string,string>},html=false){const v=(s:string)=>html?esc(s):s;const tags=vars.tags||[],fields=vars.fields||{};
 const test=(cond:string)=>{const at=cond.indexOf(':');const kind=at<0?cond:cond.slice(0,at),rest=at<0?'':cond.slice(at+1);const neg=kind.startsWith('!');const k=neg?kind.slice(1):kind;let ok=false;if(k==='tag')ok=tags.includes(rest.trim());else if(k==='field'){const [key,val]=rest.split('=');ok=val===undefined?!!fields[key.trim()]:(fields[key.trim()]||'')===val.trim();}return neg?!ok:ok;};
 const branched=input.replace(/\{\{#if\s+([^}]{1,120})\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,(_,cond,yes,no='')=>test(cond.trim())?yes:no);
 return branched.replace(/\{\{\s*field:([a-z][a-z0-9_]{0,30})\s*\}\}/g,(_,k)=>v(fields[k]||'')).replace(/\{\{\s*(name|email)\s*\}\}|%(name|mail)%/g,(_,a,b)=>v((a||b)==='name'?vars.name:vars.email));}
// Rewrites https links for click tracking. Links the reader must reach directly (unsubscribe) are added after this runs.
export function rewriteHtmlLinks(html:string,track:(url:string)=>string){return html.replace(/(<a\b[^>]*?\bhref=")(https:\/\/[^"]+)(")/gi,(_,a,u,c)=>a+esc(track(u.replace(/&amp;/g,'&')))+c);}
export function rewriteTextLinks(text:string,track:(url:string)=>string){return text.replace(/https:\/\/[^\s<>"'）」』】\]]+/g,u=>track(u));}
export function absolutize(html:string,origin:string){return html.replace(/(\b(?:src|href)=")\/(?!\/)/g,'$1'+origin+'/');}
export function withOpenPixel(html:string,pixelUrl:string){const img=`<img src="${esc(pixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">`;return /<\/body>/i.test(html)?html.replace(/<\/body>/i,img+'</body>'):html+img;}
export function withHtmlFooter(html:string,footer:string,unsubscribeUrl:string){const block=`<div style="max-width:600px;margin:0 auto;padding:16px 24px;color:#6b7690;font-size:12px;line-height:1.7;font-family:sans-serif">${paragraph(footer)}${unsubscribeUrl?`<br><a href="${esc(unsubscribeUrl)}" style="color:#6b7690">配信停止はこちら</a>`:''}</div>`;return /<\/body>/i.test(html)?html.replace(/<\/body>/i,block+'</body>'):html+block;}
export function htmlToText(html:string){return html.replace(/<(script|style)[\s\S]*?<\/\1>/gi,'').replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,(_,u,t)=>{const label=t.replace(/<[^>]+>/g,'').trim();return label&&label!==u?`${label}（${u}）`:u;}).replace(/<br\s*\/?>/gi,'\n').replace(/<\/(p|div|h[1-6]|tr|li)>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
export function contentHtml(s:{htmlMode?:string;mailBlocks?:any[];rawHtml?:string},accent?:string){return s.htmlMode==='blocks'?renderMailBlocks(s.mailBlocks||[],accent):s.htmlMode==='html'&&s.rawHtml?s.rawHtml:null;}
