'use client'

/**
 * 팀원 화면 — C-09 · FR-7.
 *
 * 팀원은 **카드만 넘긴다.** 범위도 자료도 확정도 없다 — 그건 주 클라이언트의
 * 일이고, 최종 사양은 그 사람의 선택으로 간다 (04 §5.3).
 *
 * 그래서 이 화면은 취향 카드와 끝 표시 둘뿐이다. 팀원에게 더 보여주면 그 사람이
 * 결정권자라고 오해하게 되고, 그건 계약 관계를 잘못 그리는 것이다.
 *
 * 주 클라이언트 화면과 같은 카드·같은 순서를 본다. 그래야 대조가 성립한다.
 */
import { useCallback, useRef, useState, useTransition } from 'react'
import { serializedPairAt, type BlockConfig, type SerializedPair, type Side } from '@preflight/core'
import { Gauge, Icon, Ratio, TasteCards } from '@preflight/ui'
import { memberAnswer, type MemberState } from '../../_lib/actions.ts'

export interface TeamFlowProps {
  readonly token: string
  readonly initial: MemberState
  readonly config: BlockConfig
}

export function TeamFlow({ token, initial, config }: TeamFlowProps) {
  const [state, setState] = useState<MemberState>(initial)
  const [ghost, setGhost] = useState<{ n: number; pair: SerializedPair | null } | null>(null)
  const [, start] = useTransition()
  const touch = useRef<number | null>(null)

  const pairwise = config.kind === 'PAIRWISE' ? config : null
  const answered = ghost?.n ?? state.answered
  const pair = ghost !== null ? ghost.pair : state.pair
  const done = pairwise !== null && answered >= pairwise.axes.length

  const choose = useCallback(
    (side: Side) => {
      if (pairwise === null || done) return
      // 06 §5.6 — 다음 쌍은 순수 함수라 서버가 필요 없다. 먼저 넘기고 뒤에 저장한다
      const n = answered + 1
      setGhost({ n, pair: serializedPairAt(pairwise, n) })
      start(() => {
        void memberAnswer(token, side).then(
          (s) => {
            setGhost(null)
            setState(s)
          },
          () => setGhost(null),
        )
      })
    },
    [answered, done, pairwise, token],
  )

  if (pairwise === null) return null

  if (done) {
    return (
      <main className="pf-shell">
        <span />
        <section className="pf-screen" data-screen="C-09m">
          <Icon name="check" size={28} label="Your answers are recorded" />
          <Gauge filled={pairwise.axes.length} total={pairwise.axes.length} locked />
        </section>
        <span />
      </main>
    )
  }

  return (
    <main
      className="pf-shell"
      onTouchStart={(e) => {
        touch.current = e.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        const from = touch.current
        const to = e.changedTouches[0]?.clientX ?? null
        touch.current = null
        if (from === null || to === null) return
        const dx = to - from
        if (Math.abs(dx) < 48) return
        choose(dx > 0 ? 'a' : 'b')
      }}
    >
      <header className="pf-progress">
        <Gauge filled={answered} total={pairwise.axes.length} w={150} />
        <Ratio num={answered} den={pairwise.axes.length} />
      </header>

      {pair !== null && (
        <TasteCards
          pair={pair}
          cursor={answered}
          total={pairwise.axes.length}
          onChoose={choose}
        />
      )}

      <span />
    </main>
  )
}
