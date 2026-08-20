'use client'

/**
 * 랜딩 히어로 데모 — L-00 · 06 §6.
 *
 * 이 제품은 설명이 어렵고 체험이 쉽다. 그래서 히어로의 주인공은 문장이 아니라
 * 이것이다. 가입 없이 그 자리에서 카드가 굴러가고, 그것이 그대로 Phase 0
 * 유입이 된다 (00 §7.2). 서버 세션을 만들지 않는다 — 순수하게 로컬이다.
 *
 * 세 가지가 순서대로 일어나야 한다.
 *
 *   1. 누르게 만든다      — 힌트 + 커서 + 게이지. 한 번 누르면 나머지는 관성이다
 *   2. 즉시 값을 준다      — 누를 때마다 게이지가 차고 남은 수가 준다
 *   3. 끝나면 결과를 준다  — 라벨이 아니라 **수치**가 뜬다. padding 32px · #7E8F86 · 11%
 *
 * 3번이 이 화면의 전부다. 방금 아무 문장도 쓰지 않았는데 실행 가능한 사양이
 * 나와 있다는 것 — 그게 이 제품의 논지이고, 말로 하면 안 믿기지만 겪으면 믿긴다.
 * CTA 는 그 직후에만 나타난다. 겪기 전에 권하면 아직 권할 근거가 없다.
 */
import { useState } from 'react'
import type { SerializedPair, Side } from '@preflight/core'
import { Gauge, Icon, Ratio, TasteCards } from '@preflight/ui'

/** 축 하나의 양쪽 값. measure 는 절대 번역하지 않는다 (02 §3) */
export interface DemoAxis {
  readonly axisKey: string
  readonly name: string
  readonly a: string
  readonly b: string
}

export interface HeroDemoProps {
  readonly pairs: readonly SerializedPair[]
  readonly axes: readonly DemoAxis[]
  readonly hint: string
  readonly doneTitle: string
  readonly doneSub: string
  readonly again: string
  readonly cta: string
  readonly ctaNote: string
}

export function HeroDemo({
  pairs,
  axes,
  hint,
  doneTitle,
  doneSub,
  again,
  cta,
  ctaNote,
}: HeroDemoProps) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<Side[]>([])
  const done = i >= pairs.length

  if (done) {
    return (
      <div className="lp-stage lp-stage-done">
        <div className="lp-result">
          <header className="lp-result-top">
            <Gauge filled={pairs.length} total={pairs.length} locked w={150} />
          </header>

          {/*
            라벨이 아니라 수치를 보여준다. "Wide" 는 다시 해석해야 하지만
            "padding 32px" 는 그대로 작업 지시다 — 그 차이가 제품 전체의 논지다.
          */}
          <dl className="lp-sheet">
            {axes.map((axis, n) => (
              <div key={axis.axisKey}>
                <dt>{axis.name}</dt>
                <dd>{(picked[n] ?? 'a') === 'a' ? axis.a : axis.b}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lp-payoff">
          <p className="lp-payoff-h">{doneTitle}</p>
          <p className="lp-payoff-s">{doneSub}</p>
          <a className="lp-cta" href="/pro/signup">
            {cta}
            <Icon name="arrow-right" size={18} />
          </a>
          <p className="lp-cta-note">{ctaNote}</p>
          <button
            type="button"
            className="lp-again"
            onClick={() => {
              setI(0)
              setPicked([])
            }}
          >
            {again}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="lp-stage">
      <div className="lp-stage-top">
        <Gauge filled={i} total={pairs.length} w={140} />
        <Ratio num={i + 1} den={pairs.length} />
      </div>

      <TasteCards
        pair={pairs[i]!}
        cursor={i}
        total={pairs.length}
        canBack={i > 0}
        onChoose={(side) => {
          setPicked((p) => [...p.slice(0, i), side])
          setI(i + 1)
        }}
        onBack={() => setI(Math.max(0, i - 1))}
      />

      {/* 첫 카드에서만 힌트를 준다. 한 번 누르면 나머지는 관성이다 */}
      {i === 0 && (
        <p className="lp-hint">
          <Icon name="arrow-up" size={14} />
          {hint}
        </p>
      )}
    </div>
  )
}
