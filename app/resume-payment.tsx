'use client';
import {useState} from 'react';
export default function ResumePayment({orderId}:{orderId:string}){const [busy,B]=useState(false),[error,E]=useState('');return <><button className="primary" disabled={busy} onClick={async()=>{B(true);E('');try{const r=await fetch('/api/purchase/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:orderId})});const d=await r.json() as {url:string;error:string};if(!r.ok)throw Error(d.error);location.href=d.url;}catch(e){E(String(e));B(false);}}}>カード決済へ進む</button>{error&&<p role="alert">{error}</p>}</>;}
