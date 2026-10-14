import Dashboard from './dashboard';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {identity,standalone} from '@/lib/auth';
export const dynamic='force-dynamic';
export default async function Home(){const u=await identity(await headers());if(!u)redirect(standalone()?'/login?admin=1':'/signin-with-chatgpt');if(standalone()&&u.role!=='admin')redirect('/purchases');return <Dashboard/>;}
