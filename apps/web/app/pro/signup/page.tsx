/**
 * P-01 프리랜서 가입 — FR-1.
 *
 * 로케일과 **타임존**을 받는다. 타임존이 선택 항목이 아닌 이유는 알림 시각
 * 계산에 쓰이기 때문이다 — 시차가 이 제품의 핵심 가치다 (03 §2.1 · FR-12.3).
 */
import { LOCALES } from '@preflight/core'
import { SignupForm } from './SignupForm.tsx'

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  return <SignupForm locales={[...LOCALES]} />
}
