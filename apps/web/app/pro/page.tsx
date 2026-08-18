/**
 * 프리랜서 콘솔 — P-01 대시보드 · P-02 링크 발급 · P-03 세션 상세 · P-05 오퍼.
 *
 * 이 화면은 로케일 언어를 쓴다. 무언어는 클라이언트 화면에만 적용된다.
 * 다만 measure 값은 여기서도 번역하지 않는다 (06 §4).
 */
import { runtime } from '../_lib/runtime.ts'
import { listSessions } from '../_lib/actions.ts'
import { ProConsole } from './ProConsole.tsx'

export const dynamic = 'force-dynamic'

export default async function ProPage() {
  const rt = await runtime()
  const rows = await listSessions()
  return (
    <ProConsole
      rows={rows}
      profiles={rt.profiles.map((p) => ({
        slug: p.slug,
        name: rt.dict[p.nameKey] ?? p.slug,
        reversibility: p.reversibility,
      }))}
    />
  )
}
