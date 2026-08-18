/**
 * C-05 구조 선택 — 06 §3.
 *
 * 3안이 상한이다 (설계 헌법 4). 2안은 정보가 부족하고 5안 이상은 결정 마비다.
 * `fidelity: low` 강제 — 회색 와이어프레임만. 색·이미지·실제 문구 금지.
 */
import type { ReactNode } from 'react'
import type { BlockConfig } from '@preflight/core'
import { wireframeNode, type WireRow } from '@preflight/render'
import { Figure, Label, Measure } from '../primitives.tsx'

type PickN = Extract<BlockConfig, { kind: 'PICK_N' }>

export interface StructurePickProps {
  readonly config: PickN
  readonly dict: Readonly<Record<string, string>>
  readonly selected?: number
  readonly onPick?: (index: number) => void
  readonly w?: number
  readonly h?: number
}

export function StructurePick({
  config,
  dict,
  selected,
  onPick,
  w = 110,
  h = 150,
}: StructurePickProps): ReactNode {
  return (
    <section className="pf-screen" data-screen="C-05">
      <div className="pf-picks" role="radiogroup" aria-label="Choose one of three layouts">
        {config.options.map((option, i) => (
          <button
            key={option.labelKey}
            type="button"
            role="radio"
            aria-checked={selected === i}
            className="pf-pick"
            aria-label={`Layout option ${i + 1}`}
            onClick={() => onPick?.(i)}
          >
            <Figure node={wireframeNode((option.wireframe ?? []) as readonly WireRow[], w, h)} w={w} h={h} />
            <span className="pf-pick-meta">
              <Label labelKey={option.labelKey} dict={dict} />
              <Measure value={option.measure} />
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
