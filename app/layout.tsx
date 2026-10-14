import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Akinai hub",description:"販売・顧客・配信を、自分の基盤へ。",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>}
