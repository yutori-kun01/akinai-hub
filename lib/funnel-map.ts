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
// Funnel sharing (UTAGE's ファネル共有): the pages reachable from one entry page plus the step sequences its opt-in tags
// start, as JSON. Links between pages are kept as indexes; products, A/B variants and record ids are not carried over.
const linkKeys=['nextPageId','declinePageId','bumpThanksPageId'] as const;
const strip=(r:Item):Item=>{const {id,kind,owner,version,created,updated,abParentId,...data}=r;return data;};
export function exportFunnel(rootId:string,pages:Item[],sequences:Item[]){const byId=new Map(pages.map(p=>[p.id,p]));const order:string[]=[];const walk=(id:string)=>{if(!id||order.includes(id)||!byId.has(id))return;order.push(id);const p=byId.get(id)!;for(const k of linkKeys)walk(p[k]);};walk(rootId);if(!order.length)throw Error('ページが見つかりません');
 const out=order.map(id=>{const p=strip(byId.get(id)!);for(const k of linkKeys)p[k]=p[k]?order.indexOf(p[k]):-1;return {...p,productId:'',bumpProductId:'',status:'draft',password:''} as Item;});
 const tags=new Set(out.filter(p=>p.pageType==='optin'&&p.signupTag).map(p=>p.signupTag));
 return {format:'akinai-funnel-v1',exported:new Date().toISOString(),pages:out,sequences:sequences.filter(s=>tags.has(s.tag)).map(s=>({...strip(s),status:'draft'}))};}
export function planImport(data:any,slugs:Set<string>){if(data?.format!=='akinai-funnel-v1'||!Array.isArray(data.pages)||!data.pages.length||data.pages.length>30)throw Error('Akinai hubのファネルJSON（akinai-funnel-v1・30ページまで）を選んでください');const used=new Set(slugs);
 const pages=data.pages.map((p:Item)=>{let slug=String(p.slug||'page').slice(0,60),n=1;while(used.has(slug))slug=String(p.slug||'page').slice(0,60)+'-'+(++n);used.add(slug);const links:Record<string,number>={};for(const k of linkKeys){links[k]=Number.isInteger(p[k])&&p[k]>=0&&p[k]<data.pages.length?p[k]:-1;}const page:Item={...p,slug,status:'draft',productId:'',bumpProductId:''};for(const k of linkKeys)page[k]='';return {page,links};});
 return {pages,sequences:(Array.isArray(data.sequences)?data.sequences:[]).slice(0,20).map((s:Item)=>({...s,status:'draft'}))};}
