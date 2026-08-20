/**
 * 수정 판정 — 04 §4 · C-11 · FR-9.
 *
 * 결과를 문장으로 설명하지 않는다. 아이콘 + 색 + 숫자가 말한다.
 *
 *   off     방패      3 → 3      무상, 차감 없음
 *   taste   원형 화살표 3 → 2      1회 차감
 *   change  되돌아가는 화살표  +$120 ⏱+2d   재견적
 *
 * 자동 재분류가 이 판정의 핵심이다. 클라이언트가 "취향 변경"이라고 골라도
 * 실제 변경량이 크면 방향 변경으로 올라간다 — 그렇지 않으면 재작업을
 * 프리랜서가 무상으로 감당하게 된다 (00 §9).
 */
import { invariant } from '../invariant.ts'

/** FR-9.2 — 아이콘 3종으로 표현된다 */
export const BASES = ['off', 'taste', 'change'] as const
export type Basis = (typeof BASES)[number]

export type ScopeTag = 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'REFERENCE'

export interface RequestSignals {
  /** 클라이언트가 고른 근거 */
  readonly basis: Basis
  /** 전체 구성 대비 변경 비율 (0~1) */
  readonly changeRatio?: number | undefined
  /** 순서 변경 포함 여부 */
  readonly orderChanged?: boolean | undefined
  /** 동시에 지적된 확정 축 수 */
  readonly axesTouched?: number | undefined
  /** 톤·구조 교체 요청 */
  readonly toneOrStructureSwap?: boolean | undefined
  /** 명세 밖 항목인가 */
  readonly outOfScope?: boolean | undefined
  /** 되돌림 한계점 통과 후인가 */
  readonly pnrPassed?: boolean | undefined
}

export interface RevisionState {
  readonly used: number
  readonly total: number
}

export type Outcome =
  /** 04 §4.1 — PNR 통과 후에는 수정이 아니라 신규 발주다 */
  | { readonly kind: 'new-session'; readonly iconKey: 'arrow-back' }
  /** 명세 밖 — 자동 견적 후 승인 대기 */
  | { readonly kind: 'out-of-scope'; readonly iconKey: 'currency'; readonly quoteUsd: number }
  /** 기준 위반 — 무상, 차감 없음 */
  | { readonly kind: 'free'; readonly iconKey: 'shield'; readonly revisionsAfter: RevisionState }
  /** 취향 변경 — 1회 차감 */
  | { readonly kind: 'counted'; readonly iconKey: 'refresh'; readonly revisionsAfter: RevisionState }
  /** 방향 변경 — 재견적 */
  | {
      readonly kind: 'requote'
      readonly iconKey: 'arrow-back'
      readonly quoteUsd: number
      readonly daysDelta: number
    }

/**
 * 03 §2.11 — 제출된 수정 요청 한 건.
 *
 * 판정만 하고 버리면 프리랜서가 무엇을 요청받았는지 볼 수 없다. C-11 이
 * 화면만 있고 아무 일도 안 하는 상태가 되므로 요청을 남긴다.
 *
 * note 는 **제품 전체에서 유일한 자유 텍스트**다. 클라이언트 로케일로 들어오고
 * 프리랜서 화면에서만 보인다 — 클라이언트에게 되돌아가지 않는다.
 */
export interface RevisionRequest {
  readonly id: string
  readonly at: string
  readonly basis: Basis
  /** 지적된 확정 축. spec.lines 의 key */
  readonly axisKey: string
  /** 0~100. 50 이 중립이고 양끝이 강한 변경이다 */
  readonly direction: number
  readonly note: string
  readonly verdict: Verdict
}

export interface Verdict {
  readonly basis: Basis
  /** 자동 재분류가 일어났으면 원래 근거 */
  readonly reclassifiedFrom: Basis | null
  readonly changeRatio: number
  readonly tag: ScopeTag
  readonly outcome: Outcome
}

/** 04 §4.3 자동 재분류 기준 */
export const RECLASSIFY = Object.freeze({
  changeRatioOver: 0.3,
  axesTouchedAtLeast: 3,
})

export interface JudgeConfig {
  /** 방향 변경 시 기본 재견적 (프로파일 금액에서 계산해 넘긴다) */
  readonly requoteUsd: number
  readonly requoteDays: number
  readonly outOfScopeUsd: number
}

export function judge(
  signals: RequestSignals,
  revisions: RevisionState,
  config: JudgeConfig,
): Verdict {
  invariant(revisions.used <= revisions.total, 'REVISIONS_OVERFLOW')

  const ratio = signals.changeRatio ?? 0
  const escalate =
    ratio > RECLASSIFY.changeRatioOver ||
    signals.orderChanged === true ||
    (signals.axesTouched ?? 0) >= RECLASSIFY.axesTouchedAtLeast ||
    signals.toneOrStructureSwap === true

  // 기준 위반은 재분류하지 않는다. 프리랜서가 명세를 어긴 것을 클라이언트에게
  // 재견적으로 되돌리면 이 제품이 지키려는 것과 정반대가 된다.
  const basis: Basis = signals.basis === 'off' ? 'off' : escalate ? 'change' : signals.basis
  const reclassifiedFrom = basis === signals.basis ? null : signals.basis

  if (signals.pnrPassed === true) {
    return { basis, reclassifiedFrom, changeRatio: ratio, tag: 'IN_SCOPE', outcome: { kind: 'new-session', iconKey: 'arrow-back' } }
  }

  if (signals.outOfScope === true) {
    return {
      basis,
      reclassifiedFrom,
      changeRatio: ratio,
      tag: 'OUT_OF_SCOPE',
      outcome: { kind: 'out-of-scope', iconKey: 'currency', quoteUsd: config.outOfScopeUsd },
    }
  }

  if (basis === 'off') {
    return {
      basis,
      reclassifiedFrom,
      changeRatio: ratio,
      tag: 'IN_SCOPE',
      outcome: { kind: 'free', iconKey: 'shield', revisionsAfter: revisions },
    }
  }

  if (basis === 'change') {
    return {
      basis,
      reclassifiedFrom,
      changeRatio: ratio,
      tag: 'IN_SCOPE',
      outcome: {
        kind: 'requote',
        iconKey: 'arrow-back',
        quoteUsd: config.requoteUsd,
        daysDelta: config.requoteDays,
      },
    }
  }

  // taste — 남은 횟수가 없으면 더 깎지 않고 재견적으로 넘긴다
  if (revisions.used >= revisions.total) {
    return {
      basis: 'change',
      reclassifiedFrom: 'taste',
      changeRatio: ratio,
      tag: 'IN_SCOPE',
      outcome: {
        kind: 'requote',
        iconKey: 'arrow-back',
        quoteUsd: config.requoteUsd,
        daysDelta: config.requoteDays,
      },
    }
  }

  return {
    basis,
    reclassifiedFrom,
    changeRatio: ratio,
    tag: 'IN_SCOPE',
    outcome: {
      kind: 'counted',
      iconKey: 'refresh',
      revisionsAfter: { used: revisions.used + 1, total: revisions.total },
    },
  }
}

/** 04 §4.5 — 같은 대상 3회 이상 지적되면 축이 잘못 잡힌 것이다 */
export const REPEAT_FLAG_AT = 3

export function repeatFlag(targetHits: number): boolean {
  return targetHits >= REPEAT_FLAG_AT
}
