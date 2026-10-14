import {z} from 'zod';
// Extra delivery conditions combined with AND (all) or OR (any) — UTAGE's 配信条件 with several labels/scenarios/clicks.
// They narrow the base settings (target tag, excluded tag, purchase conditions), which always apply.
export const ruleTypes=['tag','notTag','bought','notBought','opened','notOpened','clicked','notClicked','field'] as const;
export const ruleSchema=z.object({type:z.enum(ruleTypes),value:z.string().max(200).default(''),key:z.string().max(31).default('')});
export type Rule=z.infer<typeof ruleSchema>;
export type RuleContext={tags:string[];paid:Set<string>;fields:Record<string,string>;engagement:(sourceId:string)=>Promise<{opened:boolean;clicked:boolean}|null>};
export async function matchRules(rules:Rule[],match:'all'|'any',ctx:RuleContext){if(!rules.length)return true;const test=async(r:Rule)=>{switch(r.type){
 case 'tag':return ctx.tags.includes(r.value);case 'notTag':return !ctx.tags.includes(r.value);
 case 'bought':return ctx.paid.has(r.value);case 'notBought':return !ctx.paid.has(r.value);
 case 'field':return (ctx.fields[r.key]||'')===r.value;
 default:{const e=await ctx.engagement(r.value);if(!e)return false;return {opened:e.opened,notOpened:!e.opened,clicked:e.clicked,notClicked:!e.clicked}[r.type];}}};
 for(const r of rules){const ok=await test(r);if(match==='any'&&ok)return true;if(match==='all'&&!ok)return false;}return match==='all';}
