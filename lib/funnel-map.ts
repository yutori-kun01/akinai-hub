type Item=Record<string,any>;
export type Edge={kind:'next'|'yes'|'no'|'tag'|'bump';label:string;node:Node};
export type Node={key:string;page?:Item;sequence?:Item;children:Edge[]};
// Funnel overview (UTAGE's ファネル view): entry pages are optin/sales pages nothing else links to; arrows follow the page
// settings (next page, yes/no after an upsell, bump buyers) and opt-in tags into the step sequences they start.
export function buildFunnels(pages:Item[],sequences:Item[]){
 const live=pages.filter(p=>!p.abParentId);const byId=new Map(live.map(p=>[p.id,p]));
 const linked=new Set(live.flatMap(p=>[p.nextPageId,p.declinePageId,p.bumpThanksPageId]).filter(Boolean));
 const walk=(p:Item,seen:Set<string>):Node=>{const path=new Set(seen).add(p.id);const children:Edge[]=[];const to=(id:string|undefined,kind:Edge['kind'],label:string)=>{const n=id&&byId.get(id);if(n&&!path.has(n.id))children.push({kind,label,node:walk(n,path)});};
  if(p.pageType==='optin'&&p.signupTag)for(const s of sequences.filter(s=>s.tag===p.signupTag))children.push({kind:'tag',label:'タグ: '+p.signupTag,node:{key:'seq-'+p.id+'-'+s.id,sequence:s,children:[]}});
  if(p.pageType==='upsell'){to(p.nextPageId,'yes','購入した場合');to(p.declinePageId,'no','断った場合');}
  else if(p.pageType!=='thanks'){to(p.nextPageId,'next',p.pageType==='optin'?'登録後':'申込後');if(p.bumpProductId)to(p.bumpThanksPageId,'bump','バンプ購入');}
  return {key:p.id,page:p,children};};
 const roots=live.filter(p=>!linked.has(p.id)&&(p.pageType==='optin'||!p.pageType||p.pageType==='sales')).map(p=>walk(p,new Set()));
 const used=new Set<string>();const mark=(n:Node)=>{if(n.page)used.add(n.page.id);n.children.forEach(c=>mark(c.node));};roots.forEach(mark);
 return {roots,loose:live.filter(p=>!used.has(p.id))};}
