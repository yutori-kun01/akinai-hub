'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {Mail,MessageCircle,Plus} from 'lucide-react';
type Item=Record<string,any>;
import {buildFunnels,type Node} from '@/lib/funnel-map';
const yen=(n:number)=>'¥'+n.toLocaleString('ja-JP');
const rate=(a:number,b:number)=>b?(Math.round(a/b*1000)/10)+'%':'—';
const typeLabels:Record<string,string>={sales:'販売',optin:'オプトイン',upsell:'アップセル',thanks:'完了'};
function Wire({type}:{type:string}){return <span className={'fm-wire pb-wire pb-wire-'+({optin:'optin',upsell:'upsell',thanks:'thanks'}[type]||'sales')} aria-hidden="true"><i/><i/><i/><i/></span>;}
export default function FunnelMap({pages,products,sequences,onOpen,onCreate,onImport}:{pages:Item[];products:Item[];sequences:Item[];onOpen:(kind:string,item:Item)=>void;onCreate:()=>void;onImport?:(data:unknown)=>void}){
 const [days,D]=useState(30),[kpi,K]=useState<Item[]|null>(null),[error,E]=useState('');
 useEffect(()=>{K(null);E('');fetch('/api/analytics?days='+days).then(async r=>{const d=await r.json() as Item;if(!r.ok)throw Error(d.error);K(d.families);}).catch(e=>E(String(e)));},[days]);
 const {roots,loose}=buildFunnels(pages,sequences);const stat=(id:string)=>kpi?.find(f=>f.parentId===id);
 const total=(kpi||[]).reduce((a,f)=>({visitors:a.visitors+f.visitors,optins:a.optins+f.optins,paid:a.paid+f.paid,revenue:a.revenue+f.revenue}),{visitors:0,optins:0,paid:0,revenue:0});
 const product=(id:string)=>products.find(p=>p.id===id);
 const card=(n:Node):ReactNode=>{if(n.sequence){const s=n.sequence;return <button type="button" className="fm-node fm-seq" onClick={()=>onOpen('sequences',s)}><span className="fm-type">{s.channel==='line'?<MessageCircle size={12}/>:<Mail size={12}/>}ステップ配信{s.status!=='active'&&<em>{s.status==='paused'?'一時停止':'下書き'}</em>}</span><strong>{s.name}</strong><small>{s.steps?.length||0}通 ・{s.channel==='line'?'LINE':'メール'}</small><span className="fm-steps">{(s.steps||[]).slice(0,3).map((st:Item,i:number)=><span key={i}>{!st.delayHours?'登録直後':st.delayHours>=24?Math.round(st.delayHours/24)+'日後':st.delayHours+'時間後'} {st.subject}</span>)}</span></button>;}
  const p=n.page!;const k=stat(p.id);const type=p.pageType||'sales';const variants=pages.filter(v=>v.abParentId===p.id).length;const prod=product(p.productId);
  return <button type="button" className={'fm-node fm-page fm-'+type+(p.status==='published'?'':' fm-draft')} onClick={()=>onOpen('pages',p)} aria-label={`${typeLabels[type]}：${p.name}を編集`}><Wire type={type}/><span className="fm-type">{typeLabels[type]}{p.status!=='published'&&<em>下書き</em>}</span><strong>{p.name}</strong><small>/{p.slug}</small>
   <span className="fm-tags">{prod&&type!=='optin'&&type!=='thanks'&&<span>{prod.name} ・{yen(prod.price)}</span>}{p.bumpProductId&&<span className="amber">バンプ：{product(p.bumpProductId)?.name||'商品'}</span>}{variants>0&&<span>A/B {variants+1}パターン</span>}{k&&k.routes?.length>1&&<span>経路 {k.routes.length}</span>}</span>
   {type!=='thanks'&&<span className="fm-kpi">{!kpi?'集計中…':!k?'まだ訪問なし':type==='optin'?<>訪問 {k.visitors} → 登録 <b>{k.optins}</b>（{rate(k.optins,k.visitors)}）</>:<>訪問 {k.visitors} → 入金 <b>{k.paid}</b>（{rate(k.paid,k.visitors)}）</>}</span>}
  </button>;};
 const tree=(n:Node):ReactNode=><div className="fm-tree" key={n.key}>{card(n)}{n.children.length>0&&<div className={'fm-branches'+(n.children.length>1?' multi':'')}>{n.children.map(c=><div className="fm-branch" key={c.node.key}><span className={'fm-edge fm-edge-'+c.kind}><small>{c.label}</small></span>{tree(c.node)}</div>)}</div>}</div>;
 return <section className="card fm" aria-label="ファネル図">
  <div className="section-title"><div><h2>ファネル図</h2><p className="subtle">ページ・分岐・成果を一枚で。カードをクリックで編集します。矢印は各ページの「次のページ」設定と、登録タグで始まるステップ配信です。JSONで書き出した流れは、別のAkinai hubへ下書きとして読み込めます（商品は読み込み後に選び直します）。</p></div><div className="fm-actions"><div className="pb-seg" role="group" aria-label="期間">{[[7,'7日'],[30,'30日'],[0,'全期間']].map(([v,l])=><button type="button" key={v} aria-pressed={days===v} onClick={()=>D(v as number)}>{l}</button>)}</div>{onImport&&<label className="secondary compact fm-import">JSONを読み込む<input type="file" accept="application/json,.json" onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;try{onImport(JSON.parse(await f.text()));}catch{E('JSONを読み込めませんでした');}}}/></label>}<button type="button" className="primary compact" onClick={onCreate}><Plus size={14}/>ページを追加</button></div></div>
  {error&&<p role="alert" className="alert error">{error}</p>}
  <div className="fm-kpis">{[['訪問（ユニーク）',total.visitors,''],['登録',total.optins,rate(total.optins,total.visitors)],['入金',total.paid,rate(total.paid,total.visitors)],['売上',yen(total.revenue),'']].map(([l,v,r])=><div key={l as string}><span>{l}</span><strong>{kpi?v:'—'}{r&&kpi?<small> {r}</small>:null}</strong></div>)}</div>
  {roots.length===0?<p className="subtle fm-empty">オプトインまたは販売ページを作ると、ここに流れが表示されます。</p>:<div className="fm-canvas">{roots.map(r=><div className="fm-root" key={r.key}>{tree(r)}<a className="text-btn fm-export" href={'/api/hub?export=funnel&root='+encodeURIComponent(r.key)} download>この流れをJSONで書き出す</a></div>)}</div>}
  {loose.length>0&&<div className="fm-loose"><strong>どこからもつながっていないページ</strong><div>{loose.map(p=><button type="button" key={p.id} className="secondary compact" onClick={()=>onOpen('pages',p)}>{typeLabels[p.pageType||'sales']}：{p.name}</button>)}</div></div>}
  <div className="fm-legend" aria-hidden="true"><span className="fm-edge-next">次のページ</span><span className="fm-edge-yes">購入した場合</span><span className="fm-edge-no">断った場合</span><span className="fm-edge-tag">登録タグ→ステップ配信</span></div>
 </section>;}
