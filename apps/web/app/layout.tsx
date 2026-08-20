import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { kr, mono, sans } from './_lib/fonts.ts'
import './globals.css'

/**
 * metadataBase 가 있어야 opengraph-image 의 절대 주소가 만들어진다. 없으면
 * 상대 경로가 나가고 채팅 앱들이 썸네일을 못 받는다.
 */
function siteUrl(): URL {
  const explicit = process.env['PF_BASE_URL']
  if (explicit !== undefined && explicit.length > 0) return new URL(explicit)
  const vercel = process.env['VERCEL_PROJECT_PRODUCTION_URL'] ?? process.env['VERCEL_URL']
  if (vercel !== undefined && vercel.length > 0) return new URL(`https://${vercel}`)
  return new URL('http://localhost:3100')
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: 'Preflight',
  description: 'Agree before you start. In any language.',
  // 09 §2.1 — 이 제품은 링크를 채팅에 붙여넣는 것이 전부다. 썸네일이 없으면
  // 클라이언트가 보는 건 정체불명의 URL 한 줄이고, 그런 링크는 열리지 않는다.
  openGraph: {
    type: 'website',
    siteName: 'Preflight',
    title: 'Preflight',
    description: 'Agree before you start. In any language.',
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#16181c' },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // 세 폰트 변수를 html 에 건다. globals.css 의 --font-ui / --font-num 이
    // 이 변수들을 첫 후보로 읽는다. 한글은 preload 가 꺼져 있어, 변수가 여기
    // 있어도 한글이 그려지는 화면에서만 실제로 받아진다.
    <html lang="en" className={`${sans.variable} ${mono.variable} ${kr.variable}`}>
      <body>{children}</body>
    </html>
  )
}
