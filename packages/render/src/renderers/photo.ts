/**
 * `photo` 렌더러 — 08 §2.6.
 *
 * gated 유형이다. 되돌리는 데 물리적 재작업이 들어가므로 카드 단계에서
 * 광원·색온도·앵글·심도를 확정해 두는 것이 리허설(테스트컷)의 전제가 된다.
 */
import type { CardValues } from '@preflight/core'
import type { RenderNode } from '../node.ts'
import type { Renderer, RenderOpts } from '../renderer.ts'

const num = (v: unknown, fallback: number): number => (typeof v === 'number' ? v : fallback)
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback)
const str = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback)

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n))
const hex2 = (n: number): string =>
  Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, '0')

/** 색온도 오프셋(K)을 면 색으로. +K 는 따뜻하게, 0 은 중립. */
function warmthColor(wbOffsetK: number, base: [number, number, number]): string {
  const t = clamp01(wbOffsetK / 800)
  const [r, g, b] = base
  return `#${hex2(r + 28 * t)}${hex2(g + 6 * t)}${hex2(b - 30 * t)}`
}

export const photoRenderer: Renderer = {
  id: 'photo',
  fields: {
    /** light — diffused 5200K / 2-head 5600K */
    light: { kind: 'enum', values: ['natural', 'strobe'] },
    /** warmth — WB +400K / base */
    wb: { kind: 'number', min: -800, max: 800 },
    /** angle — 90° / 15° */
    angle: { kind: 'number', min: 0, max: 90 },
    /** depth — f/1.8 / f/8 */
    aperture: { kind: 'number', min: 1, max: 22 },
    /** props — props+hands / bare */
    props: { kind: 'boolean' },
  },

  render(values: CardValues, { w, h }: RenderOpts): RenderNode {
    const light = str(values['light'], 'natural')
    const wb = num(values['wb'], 0)
    const angle = num(values['angle'], 15)
    const aperture = num(values['aperture'], 1.8)
    const props = bool(values['props'], false)

    const bg = warmthColor(wb, [222, 220, 214])
    const subject = warmthColor(wb, [176, 172, 164])
    const children: RenderNode[] = [{ k: 'swatch', x: 0, y: 0, w, h, color: bg }]

    // 심도 — 조리개가 열릴수록 배경 요소가 뭉개진다(개수가 줄고 커진다)
    const sharp = aperture >= 5.6
    const bgCount = sharp ? 4 : 1
    const bgH = sharp ? 8 : 26
    for (let i = 0; i < bgCount; i++) {
      children.push({
        k: 'bar',
        x: w * 0.12,
        y: h * 0.16 + i * (bgH + 4),
        w: w * 0.76,
        h: bgH,
        fill: 'mute',
      })
    }

    // 앵글 — 90°(탑다운)는 정면 원, 15°(아이레벨)는 낮고 넓은 면
    const topDown = angle >= 60
    const size = Math.min(w, h) * 0.34
    if (topDown) {
      children.push({
        k: 'swatch',
        x: (w - size) / 2,
        y: h * 0.42,
        w: size,
        h: size,
        color: subject,
        r: size / 2,
      })
    } else {
      children.push({
        k: 'swatch',
        x: (w - size * 1.5) / 2,
        y: h * 0.56,
        w: size * 1.5,
        h: size * 0.62,
        color: subject,
        r: 4,
      })
    }

    // 광원 — natural 은 단일 확산광, strobe 는 2등 세팅
    const keys = light === 'strobe' ? [0.16, 0.84] : [0.2]
    for (const kx of keys) {
      children.push({ k: 'glyph', x: w * kx - 8, y: h * 0.06, size: 16, icon: 'circle' })
    }

    if (props) {
      children.push(
        { k: 'swatch', x: w * 0.08, y: h * 0.74, w: 16, h: 16, color: subject, r: 3 },
        { k: 'swatch', x: w * 0.82, y: h * 0.78, w: 12, h: 12, color: subject, r: 3 },
      )
    }

    return { k: 'group', x: 0, y: 0, children }
  },
}
