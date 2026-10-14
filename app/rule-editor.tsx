'use client';
import {Plus,X} from 'lucide-react';
type Item=Record<string,any>;
const labels:Record<string,string>={tag:'タグが付いている',notTag:'タグが付いていない',bought:'商品を購入済み',notBought:'商品を購入していない',opened:'配信を開封した',notOpened:'配信を開封していない',clicked:'配信のリンクをクリックした',notClicked:'配信のリンクをクリックしていない',field:'フォームの回答が一致'};
const mailOnly=['opened','notOpened','clicked','notClicked','field'];
// Extra delivery conditions (lib/rules.ts). They narrow the base settings above and are re-checked right before sending.
export default function RuleEditor({rules,match,onRules,onMatch,products,sources,line}:{rules:Item[];match:string;onRules:(r:Item[])=>void;onMatch:(m:string)=>void;products:Item[];sources:Item[];line:boolean}){
 const set=(i:number,c:Item)=>onRules(rules.map((r,j)=>j===i?{...r,...c}:r));
 return <fieldset className="rules"><legend>追加の配信条件</legend>
  {rules.length>1&&<div className="pb-seg" role="group" aria-label="条件の組み合わせ"><button type="button" aria-pressed={match!=='any'} onClick={()=>onMatch('all')}>すべて満たす（AND）</button><button type="button" aria-pressed={match==='any'} onClick={()=>onMatch('any')}>いずれかを満たす（OR）</button></div>}
  {rules.map((r,i)=><div className="rule-row" key={i}>{i>0&&<span className="rule-join">{match==='any'?'または':'かつ'}</span>}
   <select aria-label={`条件${i+1}の種類`} value={r.type} onChange={e=>set(i,{type:e.target.value,value:'',key:''})}>{Object.entries(labels).filter(([k])=>!line||!mailOnly.includes(k)).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select>
   {(r.type==='tag'||r.type==='notTag')&&<input aria-label={`条件${i+1}のタグ`} maxLength={40} placeholder="タグ名" value={r.value} onChange={e=>set(i,{value:e.target.value})}/>}
   {(r.type==='bought'||r.type==='notBought')&&<select aria-label={`条件${i+1}の商品`} value={r.value} onChange={e=>set(i,{value:e.target.value})}><option value="">商品を選択</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}
   {['opened','notOpened','clicked','notClicked'].includes(r.type)&&<select aria-label={`条件${i+1}の配信`} value={r.value} onChange={e=>set(i,{value:e.target.value})}><option value="">配信を選択</option>{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>}
   {r.type==='field'&&<><input aria-label={`条件${i+1}の項目キー`} maxLength={31} placeholder="項目キー" value={r.key} onChange={e=>set(i,{key:e.target.value})}/><input aria-label={`条件${i+1}の回答`} maxLength={200} placeholder="回答" value={r.value} onChange={e=>set(i,{value:e.target.value})}/></>}
   <button type="button" className="icon" aria-label={`条件${i+1}を削除`} onClick={()=>onRules(rules.filter((_,j)=>j!==i))}><X size={15}/></button></div>)}
  {rules.length<20&&<button type="button" className="secondary compact" onClick={()=>onRules([...rules,{type:'tag',value:'',key:''}])}><Plus size={14}/>条件を追加</button>}
  <small className="subtle">上の対象タグ・除外タグ・購入条件に加えて判定します。{line?'LINEでは開封・クリック・フォーム回答の条件は使えません。':''}</small>
 </fieldset>;}
