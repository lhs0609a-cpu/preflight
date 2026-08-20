/**
 * 확정 링크 — 05 §5 `GET /s/{token}`.
 *
 * 가입도 앱 설치도 없다 (FR-3.2 · NFR-3.2). 링크 하나가 전부다.
 * 서버에서 첫 상태를 그려 보내므로 신흥국 4G 에서도 첫 화면이 즉시 뜬다(NFR-2.1).
 */
import { notFound } from 'next/navigation'
import type { BlockConfig } from '@preflight/core'
import { runtime } from '../../_lib/runtime.ts'
import { readState, spec } from '../../_lib/actions.ts'
import { Flow } from './Flow.tsx'

export const dynamic = 'force-dynamic'

export default async function SessionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const rt = await runtime()
  const record = await rt.service.store.byToken(token)
  if (!record) notFound()

  const initial = await readState(token)
  // 확정된 링크를 다시 열면 곧바로 C-10 이 떠야 한다. 클라이언트에서 받아오면
  // 그 사이 한 프레임 동안 빈 화면이 보인다.
  const initialSpec = await spec(token)
  const configs: Record<string, BlockConfig> = {}
  for (const block of record.profile.blocks) configs[block.id] = block.config

  return (
    <Flow
      token={token}
      initial={initial}
      initialSpec={initialSpec}
      steps={record.profile.flow.length}
      dict={rt.dict}
      configs={configs}
    />
  )
}
