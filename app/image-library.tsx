'use client';
import {useEffect,useState} from 'react';
import {Trash2} from 'lucide-react';
type Img={name:string;url:string;size:number;uploaded:number;filename:string;used:boolean};
const kb=(n:number)=>n>1048576?(n/1048576).toFixed(1)+'MB':Math.ceil(n/1024)+'KB';
// Uploaded images: pick one for a block, or manage (delete unused ones) from the pages tab.
export default function ImageLibrary({onPick,manage=false}:{onPick?:(url:string)=>void;manage?:boolean}){const [rows,R]=useState<Img[]|null>(null),[error,E]=useState('');
 const load=()=>fetch('/api/assets/library').then(async r=>{const d=await r.json() as any;if(!r.ok)throw Error(d.error);R(d.images);}).catch(e=>E(String(e.message||e)));useEffect(()=>{load();},[]);
 async function remove(i:Img){if(!window.confirm(i.filename+' を削除しますか？元に戻せません。'))return;E('');const r=await fetch('/api/assets/library',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',name:i.name})});const d=await r.json() as any;if(!r.ok)E(d.error);else load();}
 if(error)return <p role="alert" className="subtle">{error}</p>;if(!rows)return <p className="subtle">読み込み中…</p>;if(!rows.length)return <p className="subtle">まだアップロードした画像はありません。</p>;
 return <div className={'img-lib'+(manage?' manage':'')}>{rows.map(i=><figure key={i.name}>{onPick?<button type="button" aria-label={i.filename+'を使う'} onClick={()=>onPick(i.url)}><img src={i.url} alt="" loading="lazy"/></button>:<img src={i.url} alt="" loading="lazy"/>}<figcaption><span title={i.filename}>{i.filename}</span><small>{kb(i.size)}{i.used?' ・使用中':''}</small>{manage&&!i.used&&<button type="button" className="icon" aria-label={i.filename+'を削除'} onClick={()=>remove(i)}><Trash2 size={14}/></button>}</figcaption></figure>)}</div>;}
