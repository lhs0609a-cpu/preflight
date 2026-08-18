/**
 * C-11 피드백 — 06 §3 · FR-9 · 04 §4.
 *
 * Q1~Q3 는 무언어. Q4 자유 입력이 **제품 전체에서 유일한 자유 텍스트 자리**이며,
 * 자동 번역되어 프리랜서에게 전달된다 (03 §2.11).
 *
 * 판정 결과도 문장이 아니다. 아이콘 + 색 + 숫자가 말한다.
 *   방패 3→3 무상 · 원형화살표 3→2 차감 · 되돌아가는화살표 +$120 ⏱+2d 재견적
 */
import { useId, type ReactNode } from 'react'
import type { Basis, Verdict } from '@preflight/core'
import type { IconKey } from '@preflight/render'
import { Icon, Label, Num } from '../primitives.tsx'

const BASIS_ICON: Readonly<Record<Basis, IconKey>> = {
  off: 'shield',
  taste: 'refresh',
  change: 'arrow-back',
}

/** 스크린리더용. 화면에는 문장으로 나가지 않는다 (NFR-4.4). */
const BASIS_ARIA: Readonly<Record<Basis, string>> = {
  off: 'The result does not match what was agreed. No revision is used.',
  taste: 'I changed my mind about a detail. This uses one revision.',
  change: 'I want a different direction. This needs a new quote.',
}

export interface FeedbackProps {
  readonly axisKeys: readonly string[]
  readonly dict: Readonly<Record<string, string>>
  readonly basis?: Basis
  readonly axisKey?: string
  readonly direction?: number
  readonly note?: string
  readonly verdict?: Verdict | null
  readonly onBasis?: (b: Basis) => void
  readonly onAxis?: (key: string) => void
  readonly onDirection?: (v: number) => void
  readonly onNote?: (v: string) => void
  readonly onSubmit?: () => void
}

export function Feedback({
  axisKeys,
  dict,
  basis,
  axisKey,
  direction = 50,
  note = '',
  verdict,
  onBasis,
  onAxis,
  onDirection,
  onNote,
  onSubmit,
}: FeedbackProps): ReactNode {
  const noteId = useId()

  return (
    <section className="pf-screen" data-screen="C-11">
      {/* Q1 — 근거 3종. 아이콘만 */}
      <div className="pf-q" role="radiogroup" aria-label="Why are you asking for a change?">
        {(Object.keys(BASIS_ICON) as Basis[]).map((b) => (
          <button
            key={b}
            type="button"
            role="radio"
            aria-checked={basis === b}
            aria-label={BASIS_ARIA[b]}
            className="pf-q-opt"
            data-basis={b}
            onClick={() => onBasis?.(b)}
          >
            <Icon name={BASIS_ICON[b]} size={22} />
          </button>
        ))}
      </div>

      {/* Q2 — 확정된 축에서만 고른다 (FR-9.6) */}
      <div className="pf-q-grid" role="radiogroup" aria-label="Which aspect should change?">
        {axisKeys.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={axisKey === key}
            className="pf-q-axis"
            onClick={() => onAxis?.(key)}
          >
            <Label labelKey={key} dict={dict} />
          </button>
        ))}
      </div>

      {/* Q3 — 방향 + 강도. 방향만 받으면 "더요"가 반복된다 (02 §4.4) */}
      <div className="pf-slider">
        <Icon name="arrow-left" size={16} />
        <input
          type="range"
          min={0}
          max={100}
          value={direction}
          aria-label="How much less or more"
          onChange={(e) => onDirection?.(Number(e.currentTarget.value))}
        />
        <Icon name="arrow-right" size={16} />
      </div>

      {/*
        Q4 — 제품 전체에서 유일한 자유 입력. 자동 번역되어 전달된다.
        안내는 aria-label 로만 단다. 보이는 텍스트 노드를 만들면 무언어 예외를
        등재해야 하고, 예외는 늘어나기 시작하면 검사가 무력해진다.
      */}
      <div className="pf-note">
        <textarea
          id={noteId}
          rows={2}
          value={note}
          placeholder="…"
          aria-label="Optional note in your own language. It will be translated for the freelancer."
          onChange={(e) => onNote?.(e.currentTarget.value)}
        />
      </div>

      <button type="button" className="pf-primary" aria-label="Send this request" onClick={onSubmit}>
        <Icon name="arrow-right" size={20} />
      </button>

      {verdict && <VerdictBadge verdict={verdict} />}
    </section>
  )
}

/** 판정 결과 — 04 §4.2. 숫자가 결과를 말한다. */
export function VerdictBadge({ verdict }: { readonly verdict: Verdict }): ReactNode {
  const o = verdict.outcome
  return (
    <p className="pf-verdict" data-basis={verdict.basis} aria-live="polite">
      <Icon name={o.iconKey} size={18} />
      {(o.kind === 'free' || o.kind === 'counted') && (
        <>
          {/* 04 §4.2 — 3 → 3 (무상) · 3 → 2 (차감). 숫자가 결과를 말한다 */}
          <Num value={o.revisionsAfter.total - o.revisionsAfter.used + (o.kind === 'counted' ? 1 : 0)} />
          <Icon name="arrow-right" size={14} />
          <Num value={o.revisionsAfter.total - o.revisionsAfter.used} />
        </>
      )}
      {o.kind === 'requote' && (
        <>
          <Num value={o.quoteUsd} unit="$" />
          <Icon name="clock" size={14} />
          <Num value={o.daysDelta} unit="d" />
        </>
      )}
      {o.kind === 'out-of-scope' && <Num value={o.quoteUsd} unit="$" />}
      {verdict.reclassifiedFrom !== null && <Num value={Math.round(verdict.changeRatio * 100)} unit="%" />}
    </p>
  )
}
