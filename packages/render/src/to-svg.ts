/**
 * RenderNode → SVG 문자열.
 *
 * 06 §5.6 — 렌더러는 이미지가 아니라 CSS/SVG 로 그린다. 파라미터로 생성하므로
 * 용량이 거의 없고, 축 하나만 다른 쌍을 만들기도 쉽다.
 *
 * 텍스트를 만드는 곳은 num · ratio · label 셋뿐이며 셋 다 문장이 될 수 없다.
 */
import { COLOR } from '@preflight/tokens'
import type { RenderNode } from './node.ts'
import type { IconKey } from './icons.ts'

export interface SvgOpts {
  readonly w: number
  readonly h: number
  /** 라벨 키 → 로케일 문자열. 없으면 키를 그대로 쓰지 않고 빈 문자열을 낸다. */
  readonly dict?: Readonly<Record<string, string>>
}

const esc = (s: string): string =>
  s.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;')

/** 최소 기하 도형. 06 §5.4 허용 목록 안에서만 그린다. */
const ICON_PATH: Partial<Record<IconKey, string>> = {
  lock: 'M5 8V6a3 3 0 0 1 6 0v2h1v6H4V8h1zm2 0h2V6a1 1 0 0 0-2 0v2z',
  unlock: 'M5 8V6a3 3 0 0 1 5.8-1H9A1 1 0 0 0 7 6v2h5v6H4V8h1z',
  check: 'M3 8.5 6 11.5 13 4.5',
  x: 'M4 4 12 12 M12 4 4 12',
  'arrow-right': 'M3 8h9 M9 5l3 3-3 3',
  'arrow-left': 'M13 8H4 M7 5 4 8l3 3',
  'arrow-back': 'M13 11H6a3 3 0 0 1 0-6h4 M8 3 6 5l2 2',
  clock: 'M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3z M8 5v3l2 1',
  shield: 'M8 3 13 5v4c0 2-2 3.6-5 4.5C5 12.6 3 11 3 9V5z',
  refresh: 'M13 8a5 5 0 1 1-1.5-3.5 M13 3v3h-3',
  scale: 'M8 3v10 M4 6h8 M4 6 2 10h4z M12 6l-2 4h4z',
  plus: 'M8 4v8 M4 8h8',
  minus: 'M4 8h8',
  circle: 'M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3z',
  square: 'M4 4h8v8H4z',
  triangle: 'M8 3 13 12H3z',
  dot: 'M8 6a2 2 0 1 0 0 4a2 2 0 0 0 0-4z',
  download: 'M8 3v7 M5 8l3 3 3-3 M4 13h8',
  upload: 'M8 12V5 M5 7l3-3 3 3 M4 13h8',
  pause: 'M6 4v8 M10 4v8',
  grid: 'M4 4h3v3H4z M9 4h3v3H9z M4 9h3v3H4z M9 9h3v3H9z',
  bar: 'M4 10h2v3H4z M7 7h2v6H7z M10 4h2v9h-2z',
  file: 'M5 3h4l2 2v8H5z M9 3v2h2',
  picture: 'M3 4h10v8H3z M5 10l2-2 2 2 2-3',
  globe: 'M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3z M3 8h10 M8 3c-3 3-3 7 0 10 M8 3c3 3 3 7 0 10',
  currency: 'M8 3v10 M10 5.5C10 4.7 9.1 4 8 4S6 4.7 6 5.5 7 7 8 7.5s2 1 2 2S9.1 12 8 12s-2-.7-2-1.5',
}

function glyph(icon: IconKey, x: number, y: number, size: number): string {
  const d = ICON_PATH[icon] ?? 'M4 4h8v8H4z'
  const s = size / 16
  return (
    `<g data-icon="${esc(icon)}" transform="translate(${x} ${y}) scale(${round(s)})" ` +
    `fill="none" stroke="${COLOR.ink}" stroke-width="1.5" stroke-linecap="round" ` +
    `stroke-linejoin="round"><path d="${d}"/></g>`
  )
}

const round = (n: number): number => Math.round(n * 1000) / 1000

function num(value: number, unit: string, digits: number | undefined): string {
  const v = digits === undefined ? String(value) : value.toFixed(digits)
  if (unit === '') return v
  if (unit === '$') return `$${v}`
  return `${v}${unit}`
}

function nodeToSvg(node: RenderNode, dict: Readonly<Record<string, string>>): string {
  switch (node.k) {
    case 'box':
      return `<rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="${node.r ?? 0}" fill="${COLOR[node.fill]}"/>`
    case 'bar':
      return `<rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" fill="${COLOR[node.fill]}"/>`
    case 'swatch':
      return `<rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="${node.r ?? 0}" fill="${esc(node.color)}"/>`
    case 'specimen':
      // 내용은 노드 종류가 정한다. 작성자가 임의 문자열을 넣을 수 없다.
      return (
        `<text x="${node.x}" y="${node.y}" font-size="${node.size}" ` +
        `font-family="${node.serif ? 'serif' : 'sans-serif'}" fill="${COLOR.ink}">Aa</text>`
      )
    case 'img':
      return (
        `<image x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" ` +
        `href="${esc(node.src)}" preserveAspectRatio="${node.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}"/>`
      )
    case 'glyph':
      return glyph(node.icon, node.x, node.y, node.size)
    case 'num':
      return (
        `<text x="${node.x}" y="${node.y}" class="pf-num" font-variant-numeric="tabular-nums" ` +
        `fill="${COLOR.ink}">${esc(num(node.value, node.unit, node.digits))}</text>`
      )
    case 'ratio':
      return (
        `<text x="${node.x}" y="${node.y}" class="pf-num" font-variant-numeric="tabular-nums" ` +
        `fill="${COLOR.ink}">${node.num} / ${node.den}</text>`
      )
    case 'gauge': {
      const cells = 10
      const cw = node.w / cells
      const on = node.total === 0 ? 0 : Math.round((node.filled / node.total) * cells)
      const parts: string[] = []
      for (let i = 0; i < cells; i++) {
        parts.push(
          `<rect x="${round(node.x + i * cw)}" y="${node.y}" width="${round(cw - 1)}" height="6" ` +
            `fill="${i < on ? COLOR.lock : COLOR.mute}"/>`,
        )
      }
      parts.push(
        `<text x="${node.x + node.w + 8}" y="${node.y + 6}" class="pf-num" ` +
          `font-variant-numeric="tabular-nums" fill="${COLOR.ink}">${node.filled} / ${node.total}</text>`,
      )
      if (node.locked) parts.push(glyph('lock', node.x + node.w + 52, node.y - 4, 14))
      return parts.join('')
    }
    case 'label': {
      const text = dict[node.key] ?? ''
      return `<text x="${node.x}" y="${node.y}" class="pf-label" fill="${COLOR.ink}">${esc(text)}</text>`
    }
    case 'group':
      return (
        `<g transform="translate(${node.x} ${node.y})">` +
        node.children.map((c) => nodeToSvg(c, dict)).join('') +
        `</g>`
      )
  }
}

export function toSvg(node: RenderNode, opts: SvgOpts): string {
  const dict = opts.dict ?? {}
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${opts.w} ${opts.h}" ` +
    `width="${opts.w}" height="${opts.h}" role="img">` +
    nodeToSvg(node, dict) +
    `</svg>`
  )
}
