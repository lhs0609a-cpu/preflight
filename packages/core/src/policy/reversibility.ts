/**
 * 되돌림 3분류가 결정하는 것 — 00 §2.4 · 02 §6 · 04 §3.1 · 08 §3.4.
 *
 * 세 문서에 흩어져 있던 정책을 표 하나로 합쳤다.
 * 흩어져 있으면 구현이 셋으로 갈라진다.
 *
 * 이 파일 밖에서 reversibility 로 분기하면 eslint 가 막는다
 * (preflight/no-reversibility-branch).
 */
import type { Reversibility } from '../profile/schema.ts'

/** 04 §4.1 판정 트리가 소비한다 */
export type RevisionMode =
  | 'counted' // 횟수 차감
  | 'until-pnr' // 되돌림 한계점까지만
  | 'per-cycle' // 주기 단위 조정

export type RehearsalRequirement = 'none' | 'required'

/** 02 §6 제작 규격 조항 */
export type CraftClause = 'full' | 'partial' | 'none'

export type PnrMode = 'none' | 'blocking'

export interface PolicyTemplate {
  readonly revisionMode: RevisionMode
  readonly rehearsal: RehearsalRequirement
  readonly craftClause: CraftClause
  readonly pnr: PnrMode
  readonly defaultRevisions: number
  /** 04 §5.4 — 영업일이 아니라 절대 시간. 국경 간에서는 영업일 정의가 서로 다르다 */
  readonly defaultResponseSlaDays: number
}

export const REVERSIBILITY_POLICY: Readonly<Record<Reversibility, PolicyTemplate>> = Object.freeze({
  cheap: {
    revisionMode: 'counted',
    rehearsal: 'none',
    craftClause: 'full',
    pnr: 'none',
    defaultRevisions: 3,
    defaultResponseSlaDays: 2,
  },
  gated: {
    revisionMode: 'until-pnr',
    rehearsal: 'required',
    craftClause: 'partial',
    pnr: 'blocking',
    defaultRevisions: 2,
    defaultResponseSlaDays: 2,
  },
  outcome: {
    revisionMode: 'per-cycle',
    rehearsal: 'none',
    craftClause: 'none',
    pnr: 'none',
    defaultRevisions: 0,
    defaultResponseSlaDays: 2,
  },
})

export interface DerivedPolicy extends PolicyTemplate {
  readonly revisionCount: number
  readonly responseSlaDays: number
  readonly pointOfNoReturnKey: string | null
  readonly pnrStageIndex: number | null
}

export interface PolicyOverrideInput {
  readonly revisionCount?: number | undefined
  readonly responseSlaDays?: number | undefined
  readonly pointOfNoReturnKey?: string | undefined
  readonly pnrStageIndex?: number | undefined
}

/**
 * 파생 가능한 값은 오버라이드할 수 없다.
 * 리허설 유무·PNR 차단 여부·수정 모드는 reversibility 만이 정한다 (07 합격 기준 4).
 */
export function derivePolicy(
  reversibility: Reversibility,
  override: PolicyOverrideInput = {},
): DerivedPolicy {
  const base = REVERSIBILITY_POLICY[reversibility]
  return Object.freeze({
    ...base,
    revisionCount: override.revisionCount ?? base.defaultRevisions,
    responseSlaDays: override.responseSlaDays ?? base.defaultResponseSlaDays,
    pointOfNoReturnKey: base.pnr === 'none' ? null : (override.pointOfNoReturnKey ?? null),
    pnrStageIndex: base.pnr === 'none' ? null : (override.pnrStageIndex ?? null),
  })
}
