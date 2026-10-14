'use client';
import {useEffect,useState,type ReactNode,type CSSProperties} from 'react';
import {videoEmbed,type PageBlock} from '@/lib/page-schema';
const toEnd=(deadline:string)=>Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(deadline)?deadline:deadline+':00+09:00');
const left=(sec:number)=>`残り ${Math.floor(sec/86400)}日 ${String(Math.floor(sec/3600)%24).padStart(2,'0')}時間 ${String(Math.floor(sec/60)%60).padStart(2,'0')}分 ${String(sec%60).padStart(2,'0')}秒`;
export function Countdown({deadline}:{deadline:string}){const [now,N]=useState<number|null>(null);useEffect(()=>{N(Date.now());const id=setInterval(()=>N(Date.now()),1000);return()=>clearInterval(id);},[]);const end=toEnd(deadline);const sec=now===null?null:Math.max(0,Math.floor((end-now)/1000));return <div className="lp-countdown">{!deadline?'受付期限を設定してください':sec===null?'受付期限：'+deadline.replace('T',' '):!Number.isFinite(end)?'期限を確認してください':sec===0?'受付は終了しました':left(sec)}</div>}
// Per-visitor countdown (UTAGE's "first access" timer): the first view is remembered in this browser only.
function Evergreen({id,hours,redirect,preview}:{id:string;hours:number;redirect:string;preview:boolean}){const [now,N]=useState<number|null>(null),[start,S]=useState<number|null>(null);useEffect(()=>{let first=Date.now();try{const k='akh_cd_'+id;const v=Number(localStorage.getItem(k));if(v>0&&!preview)first=v;else if(!preview)localStorage.setItem(k,String(first));}catch{}S(first);N(Date.now());const t=setInterval(()=>N(Date.now()),1000);return()=>clearInterval(t);},[id,preview]);const sec=now===null||start===null?null:Math.max(0,Math.floor((start+hours*3600000-now)/1000));useEffect(()=>{if(sec===0&&redirect&&!preview)location.assign(redirect);},[sec,redirect,preview]);return <div className="lp-countdown">{sec===null?`初回表示から${hours}時間限定`:sec===0?'公開期間は終了しました':left(sec)}</div>}
const paragraphs=(text:string)=>text.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
function Table({text,title}:{text:string;title:string}){const rows=text.split('\n').map(r=>r.trim()).filter(Boolean).map(r=>r.split(/\t|\|/).map(c=>c.trim()));const [head,...body]=rows;if(!head)return <p className="subtle">表の内容を入力してください</p>;return <div className="table-wrap"><table className="lp-table">{title&&<caption>{title}</caption>}<thead><tr>{head.map((c,i)=><th key={i}>{c}</th>)}</tr></thead><tbody>{body.map((r,i)=><tr key={i}>{head.map((_,j)=><td key={j}>{r[j]||''}</td>)}</tr>)}</tbody></table></div>}
function Img({b}:{b:PageBlock}){return b.url?<img className={'lp-image lp-shape-'+b.shape} src={b.url} alt={b.alt} loading="lazy"/>:<p className="subtle">画像URLを設定してください</p>}
function Block({b,deadline,form,preview}:{b:PageBlock;deadline:string;form?:ReactNode;preview:boolean}){switch(b.type){
 case 'heading':return <h2>{b.text}</h2>;
 case 'subheading':return <h3 className="lp-subheading">{b.text}</h3>;
 case 'text':return <p className="preline">{b.text}</p>;
 case 'bullets':return <ul className="lp-bullets">{b.text.split('\n').map(s=>s.trim()).filter(Boolean).map((s,i)=><li key={i}>{s}</li>)}</ul>;
 case 'image':return <Img b={b}/>;
 case 'imageText':return <div className={'lp-image-text '+(b.side==='right'?'reverse':'')}><Img b={b}/><p className="preline">{b.text}</p></div>;
 case 'video':return videoEmbed(b.url)?<iframe className="lp-video" src={videoEmbed(b.url)!} title={b.alt||'動画'} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<p className="subtle">YouTubeまたはVimeoの動画URLを設定してください</p>;
 case 'audio':return b.url?<audio className="lp-audio" controls preload="none" src={b.url}/>:<p className="subtle">音声ファイルのURLを設定してください</p>;
 case 'button':return preview?<span className="primary">{b.text||'詳しく見る'}</span>:<a className="primary" href={b.url||'#registration'}>{b.text||'詳しく見る'}</a>;
 case 'form':return <div id="registration">{form||<div className="lp-form-placeholder">登録・申込フォーム<br/><small>公開時に選択したフォームが表示されます</small></div>}</div>;
 case 'countdown':return b.countdownMode==='evergreen'?<Evergreen id={b.id} hours={b.hours} redirect={b.redirectUrl} preview={preview}/>:<Countdown deadline={deadline}/>;
 case 'progress':return <div className="lp-progress">{b.text&&<p>{b.text}</p>}<div className="lp-progress-track" role="progressbar" aria-valuenow={b.value} aria-valuemin={0} aria-valuemax={100}><span className={b.style==='stripe'?'stripe':''} style={{width:b.value+'%'}}>{b.value}%</span></div></div>;
 case 'pdf':return b.url?<div className="lp-pdf">{b.pdfMode==='viewer'&&<iframe src={b.url} title={b.title||'PDF'} style={{height:b.height}} loading="lazy"/>}<a className="secondary" href={b.url} target="_blank" rel="noopener noreferrer">📄 {b.title||'PDFを開く'}</a></div>:<p className="subtle">PDFのURLを設定してください</p>;
 case 'balloon':return <div className={'lp-balloon '+(b.side==='right'?'reverse':'')}><figure>{b.url?<img className={'lp-shape-'+b.shape} src={b.url} alt="" loading="lazy"/>:<span className="lp-avatar" aria-hidden="true">{(b.title||'？').slice(0,1)}</span>}{b.title&&<figcaption>{b.title}</figcaption>}</figure><p className="preline">{b.text}</p></div>;
 case 'accordion':return <div className="lp-accordion">{paragraphs(b.text).map((p,i)=>{const [q,...a]=p.split('\n');return <details key={i}><summary>{q}</summary><p className="preline">{a.join('\n')}</p></details>;})}</div>;
 case 'table':return <Table text={b.text} title={b.title}/>;
 case 'spacer':return <div className="lp-spacer" aria-hidden="true"/>;
 // Isolated from this site: no allow-same-origin, so scripts inside cannot read cookies or call the admin API.
 case 'html':return <iframe className="lp-html" sandbox="allow-scripts allow-popups allow-forms" srcDoc={b.text} title="埋め込みコンテンツ" style={{height:b.height}} loading="lazy"/>;
 default:return <hr/>;}}
export default function PageBlocks({blocks,accent='#315EFB',deadline='',form,preview=false}:{blocks:PageBlock[];accent?:string;deadline?:string;form?:ReactNode;preview?:boolean}){return <div className="lp-blocks" style={{'--lp-accent':accent} as CSSProperties}>{blocks.map(b=><section key={b.id} className={['lp-block','lp-'+b.tone,b.visibility&&b.visibility!=='all'?'lp-only-'+b.visibility:'',b.width==='half'?'lp-half':'',b.size&&b.size!=='m'?'lp-size-'+b.size:'',b.type==='button'&&b.animation&&b.animation!=='none'?'lp-anim-'+b.animation:'',b.type==='button'&&b.sticky?'lp-sticky':''].filter(Boolean).join(' ')} style={{textAlign:b.align,...(b.bg?{background:b.bg}:{}),...(b.color?{color:b.color}:{})}}><Block b={b} deadline={deadline} form={form} preview={preview}/></section>)}</div>}
