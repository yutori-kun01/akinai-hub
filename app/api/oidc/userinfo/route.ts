import {readAccessToken,entitlements,subjectOf,oidcEnabled,oauthError,json} from '@/lib/oidc';
import {list} from '@/lib/server';
import {workspace} from '@/lib/auth';
async function handle(req:Request){if(!oidcEnabled())return oauthError('not_configured',404);const t=await readAccessToken(req);if(!t)return json({error:'invalid_token'},401,{'WWW-Authenticate':'Bearer error="invalid_token"'});const email=String(t.payload.email);const scope=String(t.payload.scope||'').split(' ');const contact=(await list(workspace(),'contacts')).find(c=>c.email===email);return json({sub:await subjectOf(email),...(scope.includes('email')?{email,email_verified:true}:{}),...(scope.includes('profile')?{name:contact?.name&&contact.name!==email?contact.name:email.split('@')[0]}:{}),...(scope.includes('entitlements')?{entitlements:await entitlements(email,t.app)}:{})});}
export const GET=handle;export const POST=handle;
