import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'English Bloom | AI英語コーチ',
  description: '30代女性のための、優しくプロフェッショナルなAI英語添削アプリ。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
