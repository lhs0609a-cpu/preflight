/**
 * P-03 세션 상세 + P-05 검토 — 06 §4.
 *
 * 아코디언이 아니라 라우트다. 새로고침해도 열려 있고 링크로 남길 수 있다.
 */
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { deliverables, proLocale, reviewDeck } from '../../../_lib/actions.ts'
import { copyFor } from '../../../_lib/copy.ts'
import { pickLocale } from '../../../_lib/landing-copy.ts'
import { runtime } from '../../../_lib/runtime.ts'
import { SessionDetail } from './SessionDetail.tsx'

export const dynamic = 'force-dynamic'

export default async function ProSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { token } = await params
  const rt = await runtime()
  if ((await rt.service.store.byToken(token)) === undefined) notFound()

  const { lang } = await searchParams
  const locale = pickLocale((await headers()).get('accept-language'), lang, await proLocale())
  const [deck, docs] = await Promise.all([reviewDeck(token), deliverables(token, locale)])

  return (
    <SessionDetail
      token={token}
      deck={deck}
      docs={docs}
      dict={rt.dict}
      locale={locale}
      t={copyFor(locale)}
    />
  )
}
