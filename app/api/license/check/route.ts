import {checkLicense} from '@/lib/licenses';
import {limited} from '@/lib/auth';
import {response} from '@/lib/server';
// Called by buyer installs (Worker cron or the update script). No cookies; the license key is the credential.
export async function POST(req:Request){try{await limited('license:'+(req.headers.get('cf-connecting-ip')||'local'),30,10);const raw=await req.text();if(raw.length>2000)return response({valid:false,error:'リクエストが大きすぎます'},413);const r=await checkLicense(JSON.parse(raw||'{}'),new URL(req.url).origin);return response(r.body,r.status);}catch(e){return response({valid:false,error:e instanceof Error?e.message:'確認できませんでした'},400);}}
