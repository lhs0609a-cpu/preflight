/**
 * C-08 자료 체크 — 06 §3 · FR-6 · 04 §6.
 *
 * 미제공 항목에 대행 금액을, 하단에 지연 일수를 붙인다.
 * **재촉이 아니라 계산 결과다** — 문장 없이 그 사실을 전달하는 방법은 숫자뿐이다.
 */
import type { ReactNode } from 'react'
import type { BlockConfig } from '@preflight/core'
import type { IconKey } from '@preflight/render'
import { Icon, Label, Num, Ratio } from '../primitives.tsx'

type Checklist = Extract<BlockConfig, { kind: 'CHECKLIST' }>

export interface AssetCheckProps {
  readonly config: Checklist
  readonly dict: Readonly<Record<string, string>>
  readonly states?: Readonly<Record<string, { provided?: boolean; fallbackTaken?: boolean }>>
  readonly provided: number
  readonly total: number
  readonly delayedDays: number
  readonly onProvide?: (labelKey: string) => void
  readonly onFallback?: (labelKey: string) => void
}

export function AssetCheck({
  config,
  dict,
  states,
  provided,
  total,
  delayedDays,
  onProvide,
  onFallback,
}: AssetCheckProps): ReactNode {
  return (
    <section className="pf-screen" data-screen="C-08">
      <ul className="pf-assets">
        {config.items.map((item) => {
          const s = states?.[item.labelKey]
          const done = s?.provided === true || s?.fallbackTaken === true
          return (
            <li key={item.labelKey} className="pf-asset-row" data-done={done}>
              <Icon name={done ? 'check' : 'circle'} size={16} />
              <Icon name={item.icon as IconKey} size={16} />
              <Label labelKey={item.labelKey} dict={dict} />

              {done ? (
                <span />
              ) : (
                <span className="pf-asset-actions">
                  <button
                    type="button"
                    className="pf-chip"
                    aria-label={`Upload ${dict[item.labelKey] ?? item.labelKey}`}
                    onClick={() => onProvide?.(item.labelKey)}
                  >
                    <Icon name="upload" size={14} />
                  </button>
                  {item.fallbackAmountUsd !== undefined && (
                    <button
                      type="button"
                      className="pf-chip pf-chip-cost"
                      aria-label={`Let the freelancer handle it for ${item.fallbackAmountUsd} dollars`}
                      onClick={() => onFallback?.(item.labelKey)}
                    >
                      <Num value={item.fallbackAmountUsd} unit="$" />
                    </button>
                  )}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      <footer className="pf-totals" aria-label="Materials received and days the start is delayed">
        <Ratio num={provided} den={total} />
        <Icon name="clock" size={16} />
        <Num value={delayedDays} unit="d" />
      </footer>
    </section>
  )
}
