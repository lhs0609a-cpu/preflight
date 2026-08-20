/**
 * C-02 취향 카드 — 06 §3 · 핵심 화면.
 *
 * 두 카드는 딱 한 축만 다르다 — 서버가 그렇게 만들어 보낸다(05 §6).
 * 카드에 라벨을 붙이지 않는다. 붙이는 순간 재인 과제가 회상 과제로 바뀌고,
 * 이 제품이 작동하는 이유가 사라진다 (00 §2.2 · 02 §4.1).
 */
import type { ReactNode } from 'react'
import type { SerializedPair, Side } from '@preflight/core'
import { renderCard } from '@preflight/render'
import { Figure, Gauge, IconButton, Ratio } from '../primitives.tsx'

export interface TasteCardsProps {
  readonly pair: SerializedPair
  readonly cursor: number
  readonly total: number
  readonly onChoose?: (side: Side) => void
  readonly onBack?: () => void
  readonly canBack?: boolean
  readonly cardWidth?: number
  readonly cardHeight?: number
}

export function TasteCards({
  pair,
  cursor,
  total,
  onChoose,
  onBack,
  canBack = false,
  cardWidth = 150,
  cardHeight = 190,
}: TasteCardsProps): ReactNode {
  return (
    <section className="pf-screen" data-screen="C-02">
      <header className="pf-progress">
        <Gauge filled={cursor} total={total} />
        <Ratio num={cursor + 1} den={total} />
      </header>

      {/*
        key 에 축을 물린 이유는 애니메이션이다. 축이 바뀌면 React 가 이 노드를
        새로 마운트하고 그때 CSS 애니메이션이 다시 돈다 — 같은 DOM 을 재사용하면
        카드가 툭 바뀌어서 "넘긴다" 는 감각이 사라진다.
      */}
      <div
        key={pair.axisKey}
        className="pf-cards"
        role="group"
        aria-label="Two options that differ in exactly one aspect"
      >
        {pair.pair.map((card) => (
          <button
            key={card.side}
            type="button"
            className="pf-card"
            aria-label={`Choose option ${card.side.toUpperCase()}`}
            onClick={() => onChoose?.(card.side)}
          >
            <Figure
              node={renderCard(pair.renderer, card.values, { w: cardWidth, h: cardHeight })}
              w={cardWidth}
              h={cardHeight}
            />
          </button>
        ))}
      </div>

      {canBack && <IconButton icon="arrow-left" label="Go back to the previous pair" onClick={onBack} />}
    </section>
  )
}
