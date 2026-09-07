import type { Metadata } from 'next';
import { Noto_Sans_SC } from 'next/font/google';
import './globals.css';
const noto=Noto_Sans_SC({variable:'--font-noto',subsets:['latin'],weight:['400','500','600','700']});
export const metadata:Metadata={title:'Beyond Desk｜跨境电商运营工作台',description:'Bed Bath & Beyond 日常运营记录、日程与商品利润核查工作台'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body className={noto.variable}>{children}</body></html>}
