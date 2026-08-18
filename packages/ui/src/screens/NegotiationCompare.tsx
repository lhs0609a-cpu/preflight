/**
 * C-04 역제안 비교 — 06 §3 · 04 §5.
 *
 * **근거 문장이 없다.** 두 렌더링과 수치 차이만 보인다. 설득은 그림이 한다.
 * 프리랜서가 영어로 설명할 능력이 없어도 제안이 전달되는 유일한 방법이다.
 */
import type { ReactNode } from 'react'
import type { NegotiationView } from '@preflight/core'
import type { RenderNode } from '@preflight/render'
import { Figure, Icon, IconButton, Measure, Ratio } from '../primitives.tsx'

export interface NegotiationCompareProps {
  readonly item: NegotiationView
  readonly index: number
  readonly total: number
  readonly currentPreview?: RenderNode
  readonly proposedPreview?: RenderNode
  readonly onRespond?: (response: 'keep' | 'accept') => void
  readonly w?: number
  readonly h?: number
}

export function NegotiationCompare({
  item,
  index,
  total,
  currentPreview,
  proposedPreview,
  onRespond,
  w = 150,
  h = 170,
}: NegotiationCompareProps): ReactNode {
  return (
    <section className="pf-screen" data-screen="C-04">
      <Icon name="scale" size={22} label="Two options to compare" />

      <div className="pf-compare">
        <div className="pf-compare-side">
          {currentPreview && <Figure node={currentPreview} w={w} h={h} />}
          <Measure value={item.current.measure} />
          <IconButton
            icon="check"
            label="Keep the value you already chose"
            onClick={() => onRespond?.('keep')}
          />
        </div>
        <div className="pf-compare-side">
          {proposedPreview && <Figure node={proposedPreview} w={w} h={h} />}
          <Measure value={item.proposed.measure} />
          <IconButton
            icon="check"
            label="Take the freelancer's suggestion"
            onClick={() => onRespond?.('accept')}
          />
        </div>
      </div>

      <Ratio num={index + 1} den={total} />
    </section>
  )
}
