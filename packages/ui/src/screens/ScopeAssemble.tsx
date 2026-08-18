/**
 * C-07 범위 조립 — 06 §3 · FR-5.
 *
 * 아이콘 + 최소 단어 + 숫자. 체크하면 하단 합계가 즉시 바뀐다 —
 * 조립하고 있다는 감각이 이 화면의 전부다.
 */
import type { ReactNode } from 'react'
import type { BlockConfig } from '@preflight/core'
import type { IconKey } from '@preflight/render'
import { Icon, Label, Num } from '../primitives.tsx'

type Checklist = Extract<BlockConfig, { kind: 'CHECKLIST' }>

export interface ScopeAssembleProps {
  readonly config: Checklist
  readonly dict: Readonly<Record<string, string>>
  readonly selection?: Readonly<Record<string, boolean>>
  readonly amountUsd: number
  readonly weeks: number
  readonly onToggle?: (index: number, on: boolean) => void
}

export function ScopeAssemble({
  config,
  dict,
  selection,
  amountUsd,
  weeks,
  onToggle,
}: ScopeAssembleProps): ReactNode {
  return (
    <section className="pf-screen" data-screen="C-07">
      <ul className="pf-scope">
        {config.items.map((item, i) => {
          const on = selection?.[String(i)] ?? item.default
          return (
            <li key={item.labelKey}>
              <label className="pf-scope-row">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => onToggle?.(i, e.currentTarget.checked)}
                  aria-label={`Include ${dict[item.labelKey] ?? item.labelKey} for ${item.amountUsd} dollars`}
                />
                <Icon name={item.icon as IconKey} size={16} />
                <Label labelKey={item.labelKey} dict={dict} />
                <Num value={item.amountUsd} unit="$" />
              </label>
            </li>
          )
        })}
      </ul>

      <footer className="pf-totals" aria-label="Running total and timeline">
        <Num value={amountUsd} unit="$" />
        <Icon name="clock" size={16} />
        <Num value={weeks} unit="w" />
      </footer>
    </section>
  )
}
