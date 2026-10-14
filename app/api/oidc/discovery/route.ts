import {discovery,oidcEnabled,json} from '@/lib/oidc';
export async function GET(){if(!oidcEnabled())return json({error:'not_configured'},404);return json(discovery(),200,{'Cache-Control':'public, max-age=300','Access-Control-Allow-Origin':'*'});}
