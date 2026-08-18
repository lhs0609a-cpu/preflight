'use client'

/**
 * 랜딩 히어로 데모 — 06 §6.
 *
 * 가입 없이 그 자리에서 카드가 굴러간다. 그리고 그것이 그대로 Phase 0 유입이
 * 된다 (00 §7.2). 서버 세션을 만들지 않는다 — 순수하게 로컬이다.
 */
import { useState } from 'react'
import type { SerializedPair, Side } from '@preflight/core'
import { Gauge, Ratio, TasteCards } from '@preflight/ui'

export function HeroDemo({ pairs }: { readonly pairs: readonly SerializedPair[] }) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<Side[]>([])
  const done = i >= pairs.length

  if (done) {
    return (
      <div className="lp-demo lp-demo-done">
        <Gauge filled={pairs.length} total={pairs.length} locked w={160} />
        <ul className="lp-spec">
          {pairs.map((p, n) => (
            <li key={p.axisKey}>
              <span>{p.axisKey}</span>
              <b>{p.pair.find((c) => c.side === (picked[n] ?? 'a'))?.labelKey}</b>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="lp-again"
          onClick={() => {
            setI(0)
            setPicked([])
          }}
        >
          Again
        </button>
      </div>
    )
  }

  return (
    <div className="lp-demo">
      <div className="lp-demo-top">
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
    </div>
  )
}
