'use client';
import {fieldOptions,type FormField} from '@/lib/page-schema';
const auto:Record<string,string>={tel:'tel',postal:'postal-code',address:'street-address'};
// Extra questions on the opt-in and purchase forms; the server validates them again (lib/page-schema formValues).
export default function FormFields({fields,values,onChange}:{fields:FormField[];values:Record<string,string|boolean>;onChange:(key:string,v:string|boolean)=>void}){return <>{fields.map(f=>{const v=values[f.key];const label=<>{f.label}{f.required?'':<small>（任意）</small>}</>;
 if(f.type==='checkbox')return <label key={f.key} className="checkbox"><input type="checkbox" required={f.required} checked={v===true} onChange={e=>onChange(f.key,e.target.checked)}/>{f.label}</label>;
 if(f.type==='select')return <label key={f.key}>{label}<select required={f.required} value={String(v||'')} onChange={e=>onChange(f.key,e.target.value)}><option value="">選択してください</option>{fieldOptions(f).map(o=><option key={o}>{o}</option>)}</select></label>;
 if(f.type==='textarea'||f.type==='address')return <label key={f.key}>{label}<textarea rows={f.type==='address'?2:4} required={f.required} maxLength={2000} autoComplete={auto[f.type]} value={String(v||'')} onChange={e=>onChange(f.key,e.target.value)}/></label>;
 return <label key={f.key}>{label}<input type={f.type==='tel'?'tel':f.type==='date'?'date':'text'} inputMode={f.type==='postal'?'numeric':undefined} required={f.required} maxLength={300} autoComplete={auto[f.type]} placeholder={f.type==='postal'?'123-4567':undefined} value={String(v||'')} onChange={e=>onChange(f.key,e.target.value)}/></label>;})}</>;}
