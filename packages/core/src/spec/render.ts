/**
 * 사양서 출력 — 02 §7 · FR-8.4 · FR-8.6.
 *
 * 두 가지를 낸다.
 *   sheet  언어 중립 사양서. 양측이 같은 문서를 본다
 *   offer  마켓플레이스 커스텀 오퍼용 영문. 프리랜서가 **복사**한다
 *
 * 오퍼 텍스트에는 전송 기능이 붙지 않는다 (G-3 · 09 §2.2).
 * 생성만 하고 전송은 사람이 한다 — 이 선을 넘으면 고객 계정이 정지된다.
 */
import type { Spec } from './compile.ts'

export interface SheetOptions {
  /** 프리랜서 화면용 로케일 병기 (FR-8.6). 없으면 언어 중립 사양서. */
  readonly dict?: Readonly<Record<string, string>>
  readonly width?: number
}

const titleCase = (key: string): string => {
  const last = key.split('.').pop() ?? key
  return last.charAt(0).toUpperCase() + last.slice(1)
}

/**
 * 02 §7 형식.
 *
 *   PREFLIGHT SPEC · PF-2609-0142
 *   ────────────────────────────────
 *   Spacing        32 px
 *   ...
 *
 * measure 는 번역하지 않는다. 로케일 병기는 **라벨에만** 붙는다.
 */
export function renderSheet(spec: Spec, opts: SheetOptions = {}): string {
  const width = opts.width ?? 32
  const rule = '─'.repeat(width)

  const label = (key: string): string => {
    const base = titleCase(key)
    const local = opts.dict?.[key]
    return local === undefined || local === base ? base : `${base} / ${local}`
  }

  const labelWidth = Math.max(...spec.lines.map((l) => label(l.key).length), 14) + 2
  const rows = spec.lines.map((l) => `${label(l.key).padEnd(labelWidth)}${l.measure}`)

  const totals = [
    `${'Amount'.padEnd(labelWidth)}USD ${spec.amountUsd.toFixed(2)}`,
    `${'Timeline'.padEnd(labelWidth)}${spec.weeks} weeks`,
    `${'Revisions'.padEnd(labelWidth)}${spec.revisions}`,
  ]

  return [
    `PREFLIGHT SPEC · ${spec.no}`,
    rule,
    ...rows,
    rule,
    ...totals,
    rule,
    `Locked ${spec.lockedAt.slice(0, 10)}`,
  ].join('\n')
}

export interface OfferOptions {
  readonly marketplace?: string
  readonly tier?: string
}

/**
 * 마켓플레이스 오퍼 텍스트 (05 §9).
 *
 * 사양서를 그대로 옮긴다 — 새로운 약속을 만들지 않는다.
 * 클라이언트가 지정한 축은 표시하지 않는다. 오퍼는 제안이지 책임 배분표가 아니며,
 * 책임 기록은 사양서와 로그에 남는다 (04 §5.3).
 */
export function renderOfferText(spec: Spec, _opts: OfferOptions = {}): string {
  const specs = spec.lines.map((l) => `${titleCase(l.key)} ${l.measure}`).join(', ')
  return [
    `Specification ${spec.no}`,
    ``,
    `Agreed on ${spec.lockedAt.slice(0, 10)} through Preflight.`,
    `${specs}.`,
    ``,
    `Amount: USD ${spec.amountUsd.toFixed(2)}`,
    `Timeline: ${spec.weeks} weeks`,
    `Revisions included: ${spec.revisions}`,
  ].join('\n')
}
