/**
 * 사양서 — 02 §7 · 03 §2.8 · FR-8.
 *
 * 언어 중립. 숫자가 주어이고 라벨이 보조다.
 * 양측이 **같은 문서**를 본다 — 번역본 두 개를 관리하지 않는다.
 *
 * content_hash 는 "확정 시점의 사양이 이것이었다"를 증명한다 (04 §10).
 * 따라서 직렬화가 결정적이어야 한다. Map 순회 순서에 의존하면 같은 선택이
 * 다른 해시를 낳고, 그 순간 증거로서의 자격을 잃는다.
 */
import { canonicalJson, type JsonValue } from '../json.ts'
import { invariant } from '../invariant.ts'
import type { BlockOutput, SpecLine } from '../block/types.ts'
import type { CompiledProfile } from '../profile/compile.ts'

export interface SpecInput {
  readonly no: string
  readonly outputs: readonly BlockOutput[]
  readonly amountUsd: number
  readonly weeks: number
  readonly revisions: number
  /** ISO 8601. 시계를 주입받는다 — 순수하게 유지하기 위해서다. */
  readonly lockedAt: string
  readonly version?: number
}

export interface Spec {
  readonly no: string
  readonly version: number
  readonly lines: readonly SpecLine[]
  readonly amountUsd: number
  readonly weeks: number
  readonly revisions: number
  readonly lockedAt: string
}

/**
 * 라인 순서는 flow 순서 → 블록 내 정의 순서다.
 * 출력 배열이 어떤 순서로 들어와도 같은 사양서가 나온다.
 */
export function compileSpec(profile: CompiledProfile, input: SpecInput): Spec {
  const rank = new Map(profile.flow.map((id, i) => [id, i]))

  // 비교 함수 안에서 검사하면 안 된다 — 원소가 1개면 sort 가 비교 함수를
  // 아예 호출하지 않아 검증이 통째로 건너뛰어진다.
  for (const o of input.outputs) {
    invariant(rank.has(o.blockId), 'OUTPUT_BLOCK_NOT_IN_FLOW', o.blockId)
  }

  const ordered = [...input.outputs].sort((a, b) => rank.get(a.blockId)! - rank.get(b.blockId)!)

  return Object.freeze({
    no: input.no,
    version: input.version ?? 1,
    lines: Object.freeze(ordered.flatMap((o) => o.lines)),
    amountUsd: input.amountUsd,
    weeks: input.weeks,
    revisions: input.revisions,
    lockedAt: input.lockedAt,
  })
}

/**
 * 해시 대상 문자열. 키 사전순 · 공백 없음 · 금액 소수점 2자리 고정.
 *
 * 해시 자체는 여기서 계산하지 않는다. core 는 런타임 무관이어야 하는데
 * Node 의 crypto 와 브라우저의 SubtleCrypto 는 API 가 다르다.
 * 서버가 이 문자열을 받아 SHA-256 을 건다.
 */
export function specPayload(spec: Spec): string {
  const payload: JsonValue = {
    no: spec.no,
    version: spec.version,
    lockedAt: spec.lockedAt,
    amountUsd: spec.amountUsd.toFixed(2),
    weeks: spec.weeks,
    revisions: spec.revisions,
    lines: spec.lines.map((l) => ({
      key: l.key,
      value: l.value,
      measure: l.measure,
      owner: l.owner,
    })),
  }
  return canonicalJson(payload)
}

/** 04 §5.3 — 누가 정했는지만 기록한다. 시스템은 어느 쪽도 막지 않는다. */
export function applyNegotiationOutcome(
  lines: readonly SpecLine[],
  axisKey: string,
  outcome: { readonly response: 'accept' | 'keep'; readonly line: SpecLine },
): SpecLine[] {
  return lines.map((l) =>
    l.key === axisKey
      ? { ...outcome.line, owner: outcome.response === 'keep' ? 'CLIENT' : 'PRO' }
      : l,
  )
}

/** 04 §10 — 프리랜서 책임에서 제외된 축. 분쟁 시 이것부터 본다. */
export function clientOwnedAxes(spec: Spec): string[] {
  return spec.lines.filter((l) => l.owner === 'CLIENT').map((l) => l.key)
}

/** 03 §2.5 — `PF-2609-0142` */
export function formatSessionNo(year: number, month: number, seq: number): string {
  invariant(month >= 1 && month <= 12, 'MONTH_OUT_OF_RANGE', String(month))
  invariant(seq >= 0 && seq <= 9999, 'SEQ_OUT_OF_RANGE', String(seq))
  const yy = String(year % 100).padStart(2, '0')
  const mm = String(month).padStart(2, '0')
  return `PF-${yy}${mm}-${String(seq).padStart(4, '0')}`
}
