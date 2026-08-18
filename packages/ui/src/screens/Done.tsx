/**
 * C-10 완료 — 06 §3.
 *
 * 게이지가 가득 차고 자물쇠가 닫힌다 (06 §5.3). 국내판의 인장을 대신하는
 * 시그니처이며, 문화 중립이고 숫자가 주어다.
 *
 * 여기서 클라이언트의 일은 끝난다. 가입도 앱도 메신저도 없다 (00 §8-2).
 */
import type { ReactNode } from 'react'
import type { Spec } from '@preflight/core'
import { Gauge, Icon, IconButton, Label, Measure, Num } from '../primitives.tsx'

export interface DoneProps {
  readonly spec: Spec
  readonly dict: Readonly<Record<string, string>>
  readonly onDownload?: () => void
}

export function Done({ spec, dict, onDownload }: DoneProps): ReactNode {
  const n = spec.lines.length
  return (
    <section className="pf-screen" data-screen="C-10">
      <Icon name="check" size={28} label="Everything is agreed" />
      <Gauge filled={n} total={n} locked />

      <p className="pf-no">{spec.no}</p>

      <dl className="pf-spec">
        {spec.lines.map((line) => (
          <div className="pf-spec-row" key={`${line.key}:${line.value}`}>
            <dt>
              <Label labelKey={line.key} dict={dict} />
            </dt>
            <dd>
              <Measure value={line.measure} />
            </dd>
          </div>
        ))}
      </dl>

      <footer className="pf-totals" aria-label="Agreed amount, timeline and included revisions">
        <Num value={spec.amountUsd} unit="$" digits={2} />
        <Icon name="clock" size={16} />
        <Num value={spec.weeks} unit="w" />
        <Icon name="refresh" size={16} />
        <Num value={spec.revisions} />
      </footer>

      <IconButton icon="download" label="Download this specification as a PDF" onClick={onDownload} />
    </section>
  )
}
