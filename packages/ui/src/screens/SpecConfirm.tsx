/**
 * C-03 사양 확인 — 06 §3.
 *
 * 값은 전부 수치다. 확정 후 변경에 비용이 든다는 사실은 문장이 아니라
 * 자물쇠 → 화살표 → 통화 → 시계 네 개의 기호로 전달한다 (06 §2.3 · 설계 헌법 6).
 */
import type { ReactNode } from 'react'
import type { SpecLine } from '@preflight/core'
import type { RenderNode } from '@preflight/render'
import { Figure, Icon, IconButton, Label, Measure } from '../primitives.tsx'

export interface SpecConfirmProps {
  readonly lines: readonly SpecLine[]
  readonly dict: Readonly<Record<string, string>>
  /** 전 축을 반영한 합성 미리보기 */
  readonly preview?: RenderNode
  readonly previewSize?: { readonly w: number; readonly h: number }
  readonly onConfirm?: () => void
  readonly onRedo?: () => void
}

export function SpecConfirm({
  lines,
  dict,
  preview,
  previewSize = { w: 240, h: 180 },
  onConfirm,
  onRedo,
}: SpecConfirmProps): ReactNode {
  return (
    <section className="pf-screen" data-screen="C-03">
      {preview !== undefined && (
        <Figure
          node={preview}
          w={previewSize.w}
          h={previewSize.h}
          label="Preview combining every choice you made"
        />
      )}

      <dl className="pf-spec">
        {lines.map((line) => (
          <div className="pf-spec-row" key={line.key}>
            <dt>
              <Label labelKey={line.key} dict={dict} />
            </dt>
            <dd>
              <Measure value={line.measure} />
              <Icon name="lock" size={14} label="Locked once confirmed" />
            </dd>
          </div>
        ))}
      </dl>

      <p className="pf-warn" aria-label="Changing these values after confirming needs a new quote and adds time">
        <Icon name="lock" size={14} />
        <Icon name="arrow-right" size={14} />
        <Icon name="currency" size={14} />
        <Icon name="clock" size={14} />
      </p>

      <div className="pf-actions">
        <IconButton icon="check" label="Confirm and lock these values" onClick={onConfirm} />
        <IconButton icon="refresh" label="Redo the choices" onClick={onRedo} />
      </div>
    </section>
  )
}
