/**
 * 블록 게이트 — 04 §2 · FR-4.2.
 *
 * 선행 블록이 확정되기 전에는 다음 블록이 열리지 않는다.
 * gated 프로파일에서 리허설이 flow 안에 꽂혀 있으므로(12 §5.2),
 * "리허설 통과 없이 되돌림 한계점에 진입 불가"는 순서 규칙 하나로 성립한다.
 *
 * 시그니처가 M1 의 API 계약을 결정하므로 M0 에 두었다 (12 §9).
 */
import type { BlockState } from '../block/types.ts'
import type { CompiledProfile } from '../profile/compile.ts'

export interface GateInput {
  /** 확정된 블록 id */
  readonly settled: ReadonlySet<string>
  /** 제출됐으나 역제안 검토 중인 블록 id */
  readonly submitted?: ReadonlySet<string>
  /** 미응답 역제안 수 */
  readonly pendingNegotiations?: number
}

export interface GateResult {
  readonly states: ReadonlyMap<string, BlockState>
  /** 지금 열려 있는 블록. 없으면 null */
  readonly cursor: string | null
  readonly settledCount: number
  readonly requiredCount: number
  /** 04 §1.1 — 전 블록 확정 + 역제안 전부 응답 */
  readonly canSettle: boolean
  /** 04 §3.3 — gated 는 리허설 통과 전 PNR 진입 불가 */
  readonly pnrAllowed: boolean
}

export function evaluateGate(profile: CompiledProfile, input: GateInput): GateResult {
  const submitted = input.submitted ?? new Set<string>()
  const pending = input.pendingNegotiations ?? 0
  const byId = new Map(profile.blocks.map((b) => [b.id, b]))

  const states = new Map<string, BlockState>()
  let blockedFromHere = false
  let cursor: string | null = null

  for (const id of profile.flow) {
    const block = byId.get(id)
    if (input.settled.has(id)) {
      states.set(id, 'SETTLED')
      // 확정됐어도 필수 블록이 아니면 뒤를 막지 않는다
      continue
    }
    if (submitted.has(id)) {
      states.set(id, 'SUBMITTED')
      // 역제안 검토 중이면 뒤가 열리지 않는다
      blockedFromHere = true
      continue
    }
    if (blockedFromHere) {
      states.set(id, 'LOCKED_OUT')
      continue
    }
    states.set(id, 'OPEN')
    if (cursor === null) cursor = id
    // 필수 블록은 확정 전까지 뒤를 막는다. 선택 블록은 통과시킨다.
    if (block?.required !== false) blockedFromHere = true
  }

  const required = profile.blocks.filter((b) => b.required).map((b) => b.id)
  const requiredSettled = required.filter((id) => input.settled.has(id))
  const rehearsal = profile.blocks.find((b) => b.config.kind === 'REHEARSAL')

  return {
    states,
    cursor,
    settledCount: input.settled.size,
    requiredCount: required.length,
    canSettle: requiredSettled.length === required.length && pending === 0,
    pnrAllowed:
      profile.policy.pnr !== 'blocking' ||
      (rehearsal !== undefined && input.settled.has(rehearsal.id)),
  }
}

/** 05 §5 `GET /s/{token}` 의 blocks 배열. 문장이 없다 — 아이콘 키와 상태뿐. */
export interface ClientBlockView {
  readonly blockId: string
  readonly type: string
  readonly icon: string
  readonly state: BlockState
}

export function clientBlockViews(profile: CompiledProfile, gate: GateResult): ClientBlockView[] {
  const byId = new Map(profile.blocks.map((b) => [b.id, b]))
  return profile.flow.flatMap((id) => {
    const block = byId.get(id)
    if (!block) return []
    return [
      {
        blockId: id,
        type: block.type,
        icon: block.icon,
        state: gate.states.get(id) ?? 'LOCKED_OUT',
      },
    ]
  })
}
