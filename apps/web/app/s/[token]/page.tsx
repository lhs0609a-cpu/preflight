/**
 * 확정 링크 — 05 §5 `GET /s/{token}`.
 *
 * 가입도 앱 설치도 없다 (FR-3.2 · NFR-3.2). 링크 하나가 전부다.
 * 서버에서 첫 상태를 그려 보내므로 신흥국 4G 에서도 첫 화면이 즉시 뜬다(NFR-2.1).
 */
import { notFound } from 'next/navigation'
import type { BlockConfig } from '@preflight/core'
import { runtime } from '../../_lib/runtime.ts'
import { readState } from '../../_lib/actions.ts'
import { Flow } from './Flow.tsx'

export const dynamic = 'force-dynamic'

export default async function SessionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const rt = runtime()
  const record = await rt.service.store.byToken(token)
  if (!record) notFound()

  const initial = await readState(token)
  const configs: Record<string, BlockConfig> = {}
  for (const block of record.profile.blocks) configs[block.id] = block.config

  return (
    <Flow
      token={token}
      initial={initial}
      steps={record.profile.flow.length}
      dict={rt.dict}
      configs={configs}
    />
  )
}
