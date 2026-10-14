import {authenticateClient,oidcEnabled,oauthError,json} from '@/lib/oidc';
import {list} from '@/lib/server';
import {workspace} from '@/lib/auth';
// Lets a member site list the products it may link to its courses (names only; no prices or files).
export async function GET(req:Request){if(!oidcEnabled())return oauthError('not_configured',404);let app;try{app=await authenticateClient(req);}catch{return oauthError('invalid_client',401);}return json({products:(await list(workspace(),'products')).filter(p=>p.status!=='archived'&&(!app.productIds?.length||app.productIds.includes(p.id))).map(p=>({id:p.id,name:p.name}))});}
