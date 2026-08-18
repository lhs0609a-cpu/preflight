/**
 * 화면이 렌더러를 쓰는 통로.
 *
 * CardValues 는 cardOf() 만이 만드는 브랜드 타입이지만, 서버가 직렬화해 보낸
 * 쌍(05 §6)은 평범한 객체로 돌아온다. 그 값은 이미 서버에서 한 축만 다르도록
 * 만들어진 것이므로 여기서 다시 만들지 않고 그대로 그린다.
 */
import type { CardValues, JsonValue } from '@preflight/core'
import type { RenderNode } from './node.ts'
import { getRenderer, type RenderOpts } from './renderer.ts'
import type { RendererId } from '@preflight/core'

export function renderCard(
  rendererId: RendererId,
  values: Readonly<Record<string, JsonValue>>,
  opts: RenderOpts,
): RenderNode {
  return getRenderer(rendererId).render(values as CardValues, opts)
}

export type WireRow = readonly ['h' | 'b' | 's', number]

/**
 * C-05 구조 선택의 와이어프레임 — 06 §C-05.
 *
 * `fidelity: low` 강제. 색·이미지·실제 문구 금지.
 * 예쁘면 판단할 축이 가려진다 (설계 헌법 3).
 *
 *   h  제목 줄
 *   b  본문 줄
 *   s  섹션 덩어리
 */
export function wireframeNode(rows: readonly WireRow[], w: number, h: number): RenderNode {
  const pad = 12
  const gap = 6
  const inner = w - pad * 2
  const unit: Record<WireRow[0], number> = { h: 10, b: 6, s: 18 }

  const totalH = rows.reduce((n, [k, count]) => n + count * (unit[k] + gap), 0)
  const scale = totalH > h - pad * 2 ? (h - pad * 2) / totalH : 1

  const children: RenderNode[] = [{ k: 'box', x: 0, y: 0, w, h, fill: 'paper' }]
  let y = pad
  for (const [kind, count] of rows) {
    for (let i = 0; i < count; i++) {
      const bh = unit[kind] * scale
      const bw = kind === 'h' ? inner * 0.6 : inner
      children.push({ k: 'bar', x: pad, y, w: bw, h: bh, fill: 'mute' })
      y += bh + gap * scale
    }
  }
  return { k: 'group', x: 0, y: 0, children }
}
