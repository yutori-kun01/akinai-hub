// A/B assignment: the same visitor always lands on the same variant of a page (stable hash of visitor + page),
// split by each variant's weight. Pure so it can be unit-tested.
export function hash32(s:string){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}return h>>>0;}
export function chooseVariant<T extends {id:string;abWeight?:number}>(candidates:T[],seed:string):T{const list=[...candidates].sort((a,b)=>a.id.localeCompare(b.id));const weights=list.map(c=>Math.max(1,Math.min(100,c.abWeight??50)));const total=weights.reduce((a,b)=>a+b,0);let n=hash32(seed)%total;for(let i=0;i<list.length;i++){if(n<weights[i])return list[i];n-=weights[i];}return list[list.length-1];}
export const visitorPattern=/^[a-f0-9]{32}$/;
export function visitorFrom(cookie:string|null){const v=cookie?.match(/(?:^|;\s*)akh_v=([a-f0-9]{32})/)?.[1];return v&&visitorPattern.test(v)?v:'';}
// Only what the KPI table groups by: a short route label and the standard utm fields.
export function routeParams(q:URLSearchParams){const clean=(v:string|null)=>(v||'').trim().slice(0,100).replace(/[^\p{L}\p{N}_.\-]/gu,'');return {ref:clean(q.get('ref')),source:clean(q.get('utm_source')),medium:clean(q.get('utm_medium')),campaign:clean(q.get('utm_campaign'))};}
