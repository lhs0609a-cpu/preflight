/**
 * `web` 렌더러 — 08 §2.1.
 *
 * 완성도를 낮게 유지한다 (설계 헌법 3). 예쁘면 판단할 축이 가려진다.
 * 판별 대상이 아닌 정보는 전부 회색 바로 지운다 (02 §4.1).
 */
import type { CardValues } from '@preflight/core'
import type { RenderNode } from '../node.ts'
import type { Renderer, RenderOpts } from '../renderer.ts'

const num = (v: unknown, fallback: number): number => (typeof v === 'number' ? v : fallback)
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback)
const str = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback)

export const webRenderer: Renderer = {
  id: 'web',
  fields: {
    /** spacing — padding 32px / 12px */
    pad: { kind: 'number', min: 4, max: 64 },
    /** saturation — #7E8F86 · 11% / #1C6FC4 · 78% */
    c: { kind: 'color' },
    /** type — serif / sans-serif */
    sf: { kind: 'boolean' },
    /** density — 2 blocks / 6 blocks */
    rows: { kind: 'number', min: 1, max: 8 },
    /** corner — radius 0px / 12px */
    radius: { kind: 'number', min: 0, max: 24 },
    /** focus — hero image / no hero */
    hero: { kind: 'boolean' },
  },

  render(values: CardValues, { w, h }: RenderOpts): RenderNode {
    const pad = num(values['pad'], 32)
    const color = str(values['c'], '#7E8F86')
    const serif = bool(values['sf'], true)
    const rows = num(values['rows'], 2)
    const radius = num(values['radius'], 0)
    const hero = bool(values['hero'], true)

    const inner = w - pad * 2
    const children: RenderNode[] = [{ k: 'box', x: 0, y: 0, w, h, fill: 'paper' }]
    let y = pad

    if (hero) {
      const heroH = Math.min(52, Math.max(24, h * 0.3))
      children.push({ k: 'swatch', x: pad, y, w: inner, h: heroH, color, r: radius })
      y += heroH + Math.max(8, pad / 2)
    }

    // 제목 — 실제 문구 없이 바로만
    children.push({ k: 'bar', x: pad, y, w: inner * 0.62, h: 10, fill: 'ink' })
    y += 16

    // 서체 견본. 축 이름은 붙이지 않는다
    children.push({ k: 'specimen', x: pad, y: y + 12, size: 16, serif })
    y += 22

    const gap = Math.max(4, pad / 4)
    const blockH = Math.max(6, Math.min(16, (h - y - pad - (rows - 1) * gap) / Math.max(rows, 1)))
    for (let i = 0; i < rows; i++) {
      children.push({ k: 'box', x: pad, y, w: inner, h: blockH, fill: 'mute', r: radius })
      y += blockH + gap
    }

    return { k: 'group', x: 0, y: 0, children }
  },
}
