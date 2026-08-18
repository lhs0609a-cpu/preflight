/**
 * 조율 — 04 §5 · 05 §8 · C-04.
 *
 * 국내판에서는 제작사가 근거를 문장으로 썼다. 국경 간에서는 그 문장이
 * 번역 손실을 일으킨다. 그래서 **클라이언트에게는 근거가 내려가지 않는다.**
 * A/B 렌더링과 수치 차이만 간다 — 설득은 그림이 한다.
 *
 * 근거는 프리랜서 화면과 로그에만 남는다. 영어로 설득할 능력이 없어도
 * "제안은 했다"는 기록이 남으므로 낮은 평점 리스크가 줄어든다 (04 §5.3).
 */
import { invariant } from '../invariant.ts'
import type { JsonValue } from '../json.ts'
import type { SpecLine } from '../block/types.ts'

export type NegotiationResponse = 'accept' | 'keep'

export interface NegotiationProposal {
  readonly id: string
  readonly axisKey: string
  /** 현재 확정값 */
  readonly current: { readonly labelKey: string; readonly measure: string; readonly value: JsonValue }
  /** 프리랜서 제안값 */
  readonly proposed: { readonly labelKey: string; readonly measure: string; readonly value: JsonValue }
  /** 사전 정의 근거 키. 클라이언트에게 내려가지 않는다 */
  readonly reasonKey?: string | undefined
  /** 자유 입력 근거 (프리랜서 로케일). 클라이언트에게 내려가지 않는다 */
  readonly reasonFree?: string | undefined
  response: NegotiationResponse | null
}

/** 05 §8 `GET /s/{token}/negotiations` — 근거가 없다. 비교 렌더링 값만. */
export interface NegotiationView {
  readonly id: string
  readonly axisKey: string
  readonly current: { readonly labelKey: string; readonly measure: string; readonly value: JsonValue }
  readonly proposed: { readonly labelKey: string; readonly measure: string; readonly value: JsonValue }
  readonly response: NegotiationResponse | null
}

/**
 * 클라이언트로 나가는 형태.
 *
 * reasonKey · reasonFree 를 **구조적으로** 떨어뜨린다. 필드를 지우는 게 아니라
 * 애초에 다른 타입으로 옮긴다 — 나중에 "이왕이면 근거도 보여주자"가 되면
 * 타입이 막는다.
 */
export function toClientView(items: readonly NegotiationProposal[]): NegotiationView[] {
  return items.map((n) => ({
    id: n.id,
    axisKey: n.axisKey,
    current: n.current,
    proposed: n.proposed,
    response: n.response,
  }))
}

export interface RespondResult {
  readonly specLine: SpecLine
  readonly remaining: number
}

/**
 * 04 §5.3 — 시스템은 어느 쪽도 막지 않는다. 누가 정했는지만 기록한다.
 *
 *   accept  해당 축 성과 책임은 프리랜서
 *   keep    owner=CLIENT 로 마크. 그 사유의 성과는 프리랜서 책임에서 제외
 */
export function respond(
  items: NegotiationProposal[],
  id: string,
  response: NegotiationResponse,
): RespondResult {
  const item = items.find((n) => n.id === id)
  invariant(item !== undefined, 'NEGOTIATION_NOT_FOUND', id)
  invariant(item.response === null, 'NEGOTIATION_ALREADY_ANSWERED', id)
  item.response = response

  const chosen = response === 'accept' ? item.proposed : item.current
  return {
    specLine: {
      key: item.axisKey,
      value: chosen.labelKey,
      measure: chosen.measure,
      owner: response === 'keep' ? 'CLIENT' : 'PRO',
    },
    remaining: items.filter((n) => n.response === null).length,
  }
}

export function pendingCount(items: readonly NegotiationProposal[]): number {
  return items.filter((n) => n.response === null).length
}

/** 08 §3.2 — 축당 최대 1개, 프로파일당 2개 내외 */
export const MAX_PROPOSALS_PER_PROFILE = 3

export function assertProposals(items: readonly NegotiationProposal[]): void {
  invariant(items.length <= MAX_PROPOSALS_PER_PROFILE, 'TOO_MANY_PROPOSALS', String(items.length))
  const axes = items.map((n) => n.axisKey)
  invariant(new Set(axes).size === axes.length, 'DUPLICATE_AXIS_PROPOSAL', axes.join(','))
}
