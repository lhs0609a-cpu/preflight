/**
 * P-01 프리랜서 가입 — FR-1.
 *
 * 로케일은 **방문자의 브라우저 언어**에서 온다. 아직 계정이 없으므로 계정
 * 로케일을 볼 수가 없고, 그렇다고 영어로 두면 영어를 못 읽는 사람을 위한
 * 제품의 가입 화면이 영어 전용이 된다.
 *
 * 타임존을 받는다. 선택 항목이 아닌 이유는 알림 시각 계산에 쓰이기 때문이다 —
 * 시차가 이 제품의 핵심 가치다 (03 §2.1 · FR-12.3).
 */
import { headers } from 'next/headers'
import { LOCALES } from '@preflight/core'
import { pickLocale } from '../../_lib/landing-copy.ts'
import { SignupForm } from './SignupForm.tsx'

export const dynamic = 'force-dynamic'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const { lang } = await searchParams
  const locale = pickLocale((await headers()).get('accept-language'), lang)
  return <SignupForm locales={[...LOCALES]} initialLocale={locale} />
}
