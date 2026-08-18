/**
 * C-01 링크 진입 — 06 §3.
 *
 * 아바타 + 소요 시간 + 단계 개수 + 시작 버튼. 그게 전부다.
 * 여기서 문장으로 설명하기 시작하면 나머지 화면도 전부 설명하게 된다.
 */
import type { ReactNode } from 'react'
import { Icon, IconButton, Num } from '../primitives.tsx'

export interface LinkEntryProps {
  readonly avatarUrl?: string
  /** NFR-2.3 — 전 과정 5분 이내 */
  readonly minutes?: number
  readonly steps: number
  readonly onStart?: () => void
}

export function LinkEntry({ avatarUrl, minutes = 5, steps, onStart }: LinkEntryProps): ReactNode {
  return (
    <section className="pf-screen" data-screen="C-01">
      {avatarUrl !== undefined && (
        <img className="pf-avatar" src={avatarUrl} alt="Freelancer profile photo" width={64} height={64} />
      )}

      <p className="pf-duration">
        <Icon name="clock" size={18} label="Estimated time to complete" />
        <Num value={minutes} />
      </p>

      <ol className="pf-steps" aria-label={`This session has ${steps} steps`}>
        {Array.from({ length: steps }, (_, i) => (
          <li key={i}>
            <Icon name={i === 0 ? 'dot' : 'circle'} size={10} />
          </li>
        ))}
      </ol>

      <IconButton
        icon="arrow-right"
        label="Start choosing. It takes about five minutes and needs no typing."
        onClick={onStart}
      />
    </section>
  )
}
