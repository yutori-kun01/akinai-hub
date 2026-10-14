import {list,cfg} from '@/lib/server';
import {requireChatGPTUser} from '@/app/chatgpt-auth';
import {workspace} from '@/lib/auth';
import {partnerReport} from '@/lib/partners';
import SignOut from '@/app/signout-button';
import {CopyLink} from '@/app/partner-panel';
import {headers} from 'next/headers';
export const dynamic='force-dynamic';
const yen=(n:number)=>'¥'+n.toLocaleString('ja-JP');
// Partner's own view: referral links for the published pages and their monthly results. Sign-in is the buyer e-mail login.
export default async function PartnerPage(){const u=await requireChatGPTUser('/partner');const owner=workspace();const email=(u.email||'').toLowerCase();const partner=(await list(owner,'partners')).find(p=>p.email===email);
 if(!partner)return <main className="store"><h1>パートナー画面</h1><p>このメールアドレス（{email}）はパートナーとして登録されていません。販売者にお問い合わせください。</p><SignOut/></main>;
 const rows=await partnerReport(owner,partner.id);const h=await headers();const origin=cfg().PUBLIC_ORIGIN?new URL(cfg().PUBLIC_ORIGIN).origin:'https://'+h.get('host');
 const records=await list(owner);const pages=records.filter(r=>r.kind==='pages'&&r.status==='published'&&!r.abParentId&&(r.pageType||'sales')!=='thanks'&&r.pageType!=='upsell');const events=records.filter(r=>r.kind==='events'&&r.status==='published');
 const links=[...pages.map(p=>({name:p.name,url:`${origin}/shop/${encodeURIComponent(owner)}/${p.slug}?aff=${partner.code}`})),...events.map(e=>({name:e.headline,url:`${origin}/events/${encodeURIComponent(owner)}/${e.slug}?aff=${partner.code}`}))];
 return <main className="store partner"><header><span className="store-brand">パートナー画面</span><SignOut/></header><h1>{partner.name} さん</h1><p>紹介コード <code>{partner.code}</code> ・報酬 {partner.commissionType==='fixed'?yen(partner.value)+' / 件':partner.value+'%'}{partner.status!=='active'&&'（現在停止中）'}</p>
  <section className="card"><h2>紹介リンク</h2><p className="subtle">リンクから30日以内の購入が対象です（最後に踏んだリンクが優先、ご本人の購入は対象外）。</p>{links.map(l=><div className="secret-row partner-link" key={l.url}><span>{l.name}</span><input readOnly value={l.url}/><CopyLink text={l.url}/></div>)}</section>
  <section className="card"><h2>月ごとの成果</h2>{!rows.length?<p className="subtle">まだ成果はありません。</p>:<div className="table-wrap"><table><thead><tr><th>月</th><th>件数</th><th>売上</th><th>報酬</th><th>状態</th></tr></thead><tbody>{rows.map(r=><tr key={r.month}><td>{r.month}</td><td>{r.orders}</td><td>{yen(r.sales)}</td><td>{yen(r.commission)}{r.tier2?<small>うち紹介した方の成果 {yen(r.tier2)}</small>:null}</td><td>{r.payout?.status==='paid'?'お支払い済み':r.payout?'確定':'集計中・未確定'}</td></tr>)}</tbody></table></div>}<p className="subtle">入金が確認できた注文のみ数えます。月末締めで販売者が確定し、お支払いは販売者から個別に行われます。</p></section></main>;}
