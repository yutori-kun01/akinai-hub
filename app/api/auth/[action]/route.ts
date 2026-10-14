import {authAction} from '@/lib/auth';
export async function POST(req:Request,{params}:{params:Promise<{action:string}>}){return authAction(req,(await params).action);}
