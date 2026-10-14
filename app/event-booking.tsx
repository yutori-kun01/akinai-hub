'use client';
import {useState} from 'react';
import {CalendarPlus,Download} from 'lucide-react';
type Session={id:string;startsAt:string;minutes:number;capacity:number;left:number;note:string;closed:boolean};
type Mine={id:string;sessionId:string;calendar:string;join:string};
const when=(s:string)=>{const d=new Date(s+':00+09:00');return d.toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'long',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit'});};
async function post(url:string,data:unknown){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const d=await r.json() as any;if(!r.ok)throw Error(d.error);return d;}
// Session list with seats left. Booking needs a verified e-mail: the same 6-digit code sign-in as the opt-in form.
export default function EventBooking({owner,eventId,sessions,loggedEmail,mine}:{owner:string;eventId:string;sessions:Session[];loggedEmail:string;mine:Mine[]}){
 const [pick,P]=useState(''),[email,E]=useState(loggedEmail),[name,N]=useState(''),[challenge,H]=useState(''),[code,K]=useState(''),[verified,V]=useState(!!loggedEmail),[busy,B]=useState(false),[error,X]=useState('');
 async function submit(e:React.FormEvent){e.preventDefault();B(true);X('');try{if(!verified&&!challenge){const d=await post('/api/auth/request-code',{email});H(d.challenge);return;}if(!verified){await post('/api/auth/verify-code',{email,challenge,code});V(true);}await post('/api/events',{action:'book',owner,eventId,sessionId:pick,name});location.reload();}catch(e){X(e instanceof Error?e.message:String(e));}finally{B(false);}}
 async function cancel(id:string){if(!window.confirm('この予約をキャンセルしますか？'))return;B(true);X('');try{await post('/api/events',{action:'cancel',owner,bookingId:id});location.reload();}catch(e){X(e instanceof Error?e.message:String(e));B(false);}}
 return <section className="ev">
  {mine.length>0&&<div className="card ev-mine" role="status"><h2>ご予約済みの日程</h2>{mine.map(m=>{const s=sessions.find(x=>x.id===m.sessionId);return s?<div key={m.id} className="ev-mine-row"><strong>{when(s.startsAt)}（{s.minutes}分）</strong>{m.join&&<a className="primary compact" href={m.join} target="_blank" rel="noopener noreferrer">参加URLを開く</a>}<a className="secondary compact" href={m.calendar} target="_blank" rel="noopener noreferrer"><CalendarPlus size={14}/>Googleカレンダー</a><a className="secondary compact" href={`/api/events?owner=${encodeURIComponent(owner)}&booking=${m.id}`}><Download size={14}/>予定ファイル</a><button type="button" className="text-btn" disabled={busy} onClick={()=>cancel(m.id)}>キャンセルする</button></div>:null;})}</div>}
  {!sessions.some(s=>!s.closed&&s.left>0&&!mine.some(m=>m.sessionId===s.id))?<p className="card subtle">{mine.length?'予約できるほかの日程はありません。':'現在予約できる日程はありません。'}</p>:<form className="card fields" onSubmit={submit}><h2>日程を選んで予約する</h2>
   <fieldset className="ev-sessions"><legend>日程</legend>{sessions.map(s=>{const booked=mine.some(m=>m.sessionId===s.id);const full=s.left<=0;return <label key={s.id} className={'ev-session'+(pick===s.id?' on':'')+(full||s.closed||booked?' off':'')}><input type="radio" name="session" value={s.id} required disabled={full||s.closed||booked} checked={pick===s.id} onChange={()=>P(s.id)}/><span><strong>{when(s.startsAt)}</strong><small>{s.minutes}分{s.note?' ・'+s.note:''}</small></span><em>{booked?'予約済み':s.closed?'受付終了':full?'満席':`残り${s.left}席`}</em></label>;})}</fieldset>
   {!loggedEmail&&<label>お名前<input required maxLength={200} value={name} onChange={e=>N(e.target.value)} autoComplete="name"/></label>}
   <label>メールアドレス<input required type="email" autoComplete="email" readOnly={!!loggedEmail||!!challenge} value={email} onChange={e=>E(e.target.value)}/></label>
   {challenge&&<label>届いた6桁の認証コード<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" value={code} onChange={e=>K(e.target.value)}/><small>10分以内に入力してください。</small></label>}
   {error&&<p role="alert">{error}</p>}
   <button className="primary" disabled={busy||!pick}>{busy?'処理中…':verified||challenge?'この日程で予約する':'認証コードを送る'}</button>
   <small className="subtle">予約確認とリマインドをメールでお送りします。</small>
  </form>}</section>;}
