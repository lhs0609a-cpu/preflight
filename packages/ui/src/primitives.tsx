/**
 * 클라이언트 화면 프리미티브 — 06 §2.
 *
 * 여기서 나가는 텍스트는 세 종류뿐이다.
 *   수치   32px · $380 · 6w
 *   비율   2 / 6
 *   라벨   로케일 번들에 등재되고 8개 언어 전부 3단어 이내인 키
 *
 * 설명 문장을 넣을 자리가 없다. aria-label 에는 문장을 쓴다 — 스크린리더용
 * 텍스트는 로케일 언어를 쓰며 무언어 검사에서 제외된다 (NFR-4.4 · 06 §2.4).
 */
import type { ReactNode } from 'react'
import { toSvg, type IconKey, type RenderNode, type Unit } from '@preflight/render'

export interface FigureProps {
  readonly node: RenderNode
  readonly w: number
  readonly h: number
  readonly dict?: Readonly<Record<string, string>>
  /** 스크린리더용. 문장을 써도 된다. */
  readonly label?: string
  readonly className?: string
}

/**
 * 렌더 트리를 화면에 붙이는 유일한 통로.
 *
 * React 로 SVG 를 다시 조립하지 않는다. toSvg 가 유일한 렌더러여야
 * 브라우저·서버 PNG·테스트가 같은 그림을 보고, 셋이 어긋나지 않는다 (12 §6.2).
 */
export function Figure({ node, w, h, dict, label, className }: FigureProps): ReactNode {
  return (
    <span
      className={className ?? 'pf-figure'}
      role="img"
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: toSvg(node, { w, h, ...(dict ? { dict } : {}) }) }}
    />
  )
}

export function Icon({
  name,
  size = 16,
  label,
}: {
  readonly name: IconKey
  readonly size?: number
  readonly label?: string
}): ReactNode {
  return (
    <Figure
      className="pf-icon"
      node={{ k: 'glyph', x: 1, y: 1, size: size - 2, icon: name }}
      w={size}
      h={size}
      {...(label === undefined ? {} : { label })}
    />
  )
}

/** 06 §5.1 — 수치가 이 제품의 주어다. 본문보다 시각적으로 강해야 한다. */
export function Num({
  value,
  unit = '',
  digits,
}: {
  readonly value: number
  readonly unit?: Unit
  readonly digits?: number
}): ReactNode {
  const v = digits === undefined ? String(value) : value.toFixed(digits)
  const text = unit === '' ? v : unit === '$' ? `$${v}` : `${v}${unit}`
  return <span className="pf-num">{text}</span>
}

export function Ratio({ num, den }: { readonly num: number; readonly den: number }): ReactNode {
  return (
    <span className="pf-num">
      {num} / {den}
    </span>
  )
}

/** 06 §5.3 시그니처. 인장 대신 잠금 게이지 — 문화 중립이고 숫자가 주어다. */
export function Gauge({
  filled,
  total,
  locked = false,
  w = 140,
}: {
  readonly filled: number
  readonly total: number
  readonly locked?: boolean
  readonly w?: number
}): ReactNode {
  return (
    <Figure
      className="pf-gauge"
      node={{ k: 'gauge', x: 0, y: 2, w, filled, total, locked }}
      w={w + 90}
      h={16}
      label={`${filled} of ${total} decisions locked`}
    />
  )
}

/** 등재된 라벨만. 미등재 키는 프로파일 컴파일에서 이미 걸러졌다. */
export function Label({
  labelKey,
  dict,
}: {
  readonly labelKey: string
  readonly dict: Readonly<Record<string, string>>
}): ReactNode {
  return <span className="pf-label">{dict[labelKey] ?? ''}</span>
}

/** measure 는 절대 번역하지 않는다 (02 §3). */
export function Measure({ value }: { readonly value: string }): ReactNode {
  return <span className="pf-measure">{value}</span>
}

export function IconButton({
  icon,
  label,
  onClick,
  disabled,
  size = 22,
}: {
  readonly icon: IconKey
  /** 문장을 써도 된다. 스크린리더 전용이다. */
  readonly label: string
  readonly onClick?: (() => void) | undefined
  readonly disabled?: boolean | undefined
  readonly size?: number | undefined
}): ReactNode {
  return (
    <button type="button" className="pf-iconbtn" aria-label={label} onClick={onClick} disabled={disabled}>
      <Icon name={icon} size={size} />
    </button>
  )
}
