/**
 * 프리랜서 콘솔 — P-02 링크 발급 · P-03 세션 목록.
 *
 * 이 화면은 로케일 언어를 쓴다. 무언어는 클라이언트 화면에만 적용된다.
 * 다만 measure 값은 여기서도 번역하지 않는다 (06 §4).
 */
import { headers } from 'next/headers'
import { LOCALES, LOCALE_INFO } from '@preflight/core'
import { runtime } from '../_lib/runtime.ts'
import { listSessions, proLocale } from '../_lib/actions.ts'
import { copyFor } from '../_lib/copy.ts'
import { pickLocale } from '../_lib/landing-copy.ts'
import { ProConsole } from './ProConsole.tsx'

export const dynamic = 'force-dynamic'

export default async function ProPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const rt = await runtime()
  const [rows, accountLocale, { lang }, h] = await Promise.all([
    listSessions(),
    proLocale(),
    searchParams,
    headers(),
  ])
  // ?lang → 브라우저 언어 → 계정 로케일. 실제 인증이 붙기 전까지는 계정이
  // 하나뿐이라, 이 순서가 아니면 20개 중 19개에 도달할 방법이 없다.
  const locale = pickLocale(h.get('accept-language'), lang, accountLocale)
  return (
    <ProConsole
      rows={rows}
      locale={locale}
      langs={LOCALES.map((l) => ({ code: l, name: LOCALE_INFO[l].nativeName }))}
      t={copyFor(locale)}
      profiles={rt.profiles.map((p) => ({
        slug: p.slug,
        name: rt.dict[p.nameKey] ?? p.slug,
        reversibility: p.reversibility,
      }))}
    />
  )
}
