/**
 * 개발용 데모 링크 — 프로파일 하나로 세션을 즉시 발급하고 그 링크로 보낸다.
 *
 * 07 §5.3 의 비영어권 15인 테스트를 프리랜서 콘솔을 거치지 않고 돌리기 위한
 * 통로다. 운영에서는 열지 않는다 — 인증 없이 세션을 만드는 경로이기 때문이다.
 */
import { NextResponse } from 'next/server'
import { runtime } from '../../_lib/runtime.ts'

export const dynamic = 'force-dynamic'

export async function GET(req: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production' && process.env['PF_ALLOW_DEMO'] !== '1') {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }
  const slug = new URL(req.url).searchParams.get('slug') ?? 'web'
  const rt = runtime()
  const profile = rt.profiles.find((p) => p.slug === slug)
  if (!profile) return NextResponse.json({ error: 'PROFILE_NOT_FOUND', slug }, { status: 404 })

  const issued = await rt.service.issue({ proId: rt.proId, profile, clientLabel: 'Demo' })
  return NextResponse.redirect(new URL(`/s/${issued.token}`, req.url), 303)
}
