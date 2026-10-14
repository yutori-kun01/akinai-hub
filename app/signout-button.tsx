'use client';
export default function SignOut(){return <button className="text-btn" onClick={async()=>{const r=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});location.href=r.status===404?'/signout-with-chatgpt':'/login';}}>ログアウト</button>;}
