import {cfg} from './server';
import {hmacHex} from './jwt';
// Viewing password for a public page: the cookie holds an HMAC of page id + current password, so changing the password locks everyone out again.
export async function unlockToken(page:{id:string;password:string}){const s=cfg().AUTH_SECRET||cfg().MAIL_TOKEN_SECRET;if(!s)throw Error('AUTH_SECRET が未設定です');return (await hmacHex(s,'page-pass:'+page.id+':'+page.password)).slice(0,40);}
export const unlockCookie=(id:string)=>'akh_pw_'+id.replace(/[^a-zA-Z0-9-]/g,'');
export async function unlocked(page:{id:string;password:string},cookie:string|null){if(!page.password)return true;const v=cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith(unlockCookie(page.id)+'='))?.split('=')[1]||'';return v.length===40&&v===await unlockToken(page);}
export {safeCss} from './page-access-css';
