import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';
import Navbar from '@/components/navbar';

export const metadata: Metadata = {
  title: {
    default: '爆了么 - 自媒体爆款智能创作系统',
    template: '%s | 爆了么',
  },
  description:
    '爆了么是一款面向公众号运营的AI自媒体爆款智能创作系统，主打低粉爆款对标 + AI批量创作 + 一键发公众号，帮助自媒体人快速出文、追热点、做账号矩阵。',
  keywords: [
    '爆了么',
    '自媒体',
    'AI写作',
    '公众号',
    '爆款文章',
    '智能创作',
    '文章生成',
    '一键排版',
    '提示词',
  ],
  authors: [{ name: '爆了么 Team' }],
  generator: '爆了么',
  openGraph: {
    title: '爆了么 - 自媒体爆款智能创作系统',
    description: 'AI写作+智能配图+一键发公众号，帮助自媒体人快速出文、追热点、做账号矩阵',
    url: 'https://www.baolem.com',
    siteName: '爆了么',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className={`antialiased bg-gray-50`}>
        {isDev && <Inspector />}
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
