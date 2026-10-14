'use client';
import {useState} from 'react';
import {ArrowUp,ArrowDown,Trash2,Plus} from 'lucide-react';
import {renderMailBlocks} from '@/lib/mail-html';
type Item=Record<string,any>;
const labels:Record<string,string>={heading:'見出し',text:'本文',image:'画像',button:'ボタン',divider:'区切り線',spacer:'余白'};
const blank=(type:string)=>({id:crypto.randomUUID(),type,text:type==='heading'?'見出し':type==='button'?'詳しく見る':'',url:'',alt:'',align:type==='button'?'center':'left',tone:'plain',visibility:'all'});
// Edits one mail (a campaign or one sequence step). value holds subject/body/htmlMode/mailBlocks/rawHtml; LINE stays text-only.
export default function MailEditor({value,onChange,line=false}:{value:Item;onChange:(key:string,v:unknown)=>void;line?:boolean}){
 const mode=line?'text':value.htmlMode||'text';const blocks:Item[]=value.mailBlocks||[];const [busy,B]=useState(-1),[error,E]=useState('');
 const set=(i:number,change:Item)=>onChange('mailBlocks',blocks.map((b,j)=>j===i?{...b,...change}:b));
 const move=(i:number,n:number)=>{const next=[...blocks];[next[i],next[i+n]]=[next[i+n],next[i]];onChange('mailBlocks',next);};
 async function upload(i:number,file:File){B(i);E('');try{const form=new FormData();form.set('purpose','image');form.set('file',file);const r=await fetch('/api/assets',{method:'POST',body:form});const d=await r.json() as Item;if(!r.ok)throw Error(d.error);set(i,{url:d.url});}catch(e){E(e instanceof Error?e.message:String(e));}finally{B(-1);}}
 const preview=mode==='blocks'?renderMailBlocks(blocks as any):mode==='html'?String(value.rawHtml||''):'';
 return <div className="mail-editor">
  {!line&&<label>メール形式<select value={mode} onChange={e=>{onChange('htmlMode',e.target.value);if(e.target.value==='blocks'&&!blocks.length)onChange('mailBlocks',[blank('heading'),blank('text'),blank('button')]);}}><option value="text">テキストメール</option><option value="blocks">HTMLメール（ブロックで作成）</option><option value="html">HTMLメール（HTMLを直接入力）</option></select></label>}
  {mode==='blocks'&&<div className="mail-blocks">{blocks.map((b,i)=><fieldset key={b.id} className="mail-block"><legend>{labels[b.type]||b.type}</legend>
   {['heading','text','button'].includes(b.type)&&(b.type==='text'?<label>本文<textarea rows={5} value={b.text} onChange={e=>set(i,{text:e.target.value})}/></label>:<label>{b.type==='button'?'ボタンの文言':'見出し'}<input value={b.text} onChange={e=>set(i,{text:e.target.value})}/></label>)}
   {['image','button'].includes(b.type)&&<label>{b.type==='image'?'画像URL':'リンク先URL（https）'}<input type="url" value={b.url} onChange={e=>set(i,{url:e.target.value})}/></label>}
   {b.type==='image'&&<><label>代替テキスト<input value={b.alt} onChange={e=>set(i,{alt:e.target.value})}/></label><label>画像をアップロード<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy===i} onChange={e=>e.target.files?.[0]&&upload(i,e.target.files[0])}/></label></>}
   {!['divider','spacer'].includes(b.type)&&<div className="field-row"><label>配置<select value={b.align} onChange={e=>set(i,{align:e.target.value})}><option value="left">左</option><option value="center">中央</option></select></label><label>背景<select value={b.tone} onChange={e=>set(i,{tone:e.target.value})}><option value="plain">白</option><option value="soft">淡色</option><option value="accent">アクセント</option></select></label></div>}
   <div className="row-actions"><button type="button" className="icon" aria-label="上へ" disabled={i===0} onClick={()=>move(i,-1)}><ArrowUp size={15}/></button><button type="button" className="icon" aria-label="下へ" disabled={i===blocks.length-1} onClick={()=>move(i,1)}><ArrowDown size={15}/></button><button type="button" className="icon" aria-label="削除" onClick={()=>onChange('mailBlocks',blocks.filter((_,j)=>j!==i))}><Trash2 size={15}/></button></div>
  </fieldset>)}<div className="row-actions">{Object.keys(labels).map(t=><button key={t} type="button" className="secondary compact" onClick={()=>onChange('mailBlocks',[...blocks,blank(t)])}><Plus size={13}/>{labels[t]}</button>)}</div></div>}
  {mode==='html'&&<label>HTML本文<textarea rows={12} spellCheck={false} className="code" value={value.rawHtml||''} onChange={e=>onChange('rawHtml',e.target.value)}/><small>インラインスタイルで作成してください。外部スクリプトはメールでは動作しません。</small></label>}
  {error&&<p role="alert" className="alert error">{error}</p>}
  {preview&&<div className="mail-preview"><small>プレビュー（差し込み・計測・フッターは送信時に追加）</small><iframe title="HTMLメールのプレビュー" sandbox="" srcDoc={preview}/></div>}
  <label>{mode==='text'?'本文（テキスト）':'テキスト版（HTMLを表示できない環境向け。空欄ならHTMLから自動作成）'}<textarea rows={mode==='text'?12:4} value={value.body||''} onChange={e=>onChange('body',e.target.value)}/></label>
  <p className="subtle">差し込み：<code>{'{{name}}'}</code> お名前、<code>{'{{email}}'}</code> メールアドレス（UTAGE形式の <code>%name%</code> <code>%mail%</code> も可）、<code>{'{{field:項目キー}}'}</code> フォームの回答。出し分け：<code>{'{{#if tag:vip}}…{{else}}…{{/if}}'}</code>、<code>{'{{#if field:pref=東京都}}…{{/if}}'}</code>（<code>!tag:</code>で「付いていない」）。</p>
 </div>;}
