import {requireChatGPTUser} from '@/app/chatgpt-auth';
import LineConnect from './widget';
export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}){const {page=''}=await searchParams;await requireChatGPTUser('/line-connect?page='+encodeURIComponent(page));return <main className="store" style={{maxWidth:640}}><a href="/" className="store-brand">Akinai hub</a><h1>LINEとアカウントを連携</h1><p>LINEの配信と購入情報を結び付けます。連携コードを公式アカウントのトークに送ってください。</p><LineConnect pageId={page}/></main>}
