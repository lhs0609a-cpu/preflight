/**
 * 세션 상태 머신 — 04 §1.
 *
 * MATCHED 이후 상태(IN_WORK · REVIEW)는 마켓플레이스 워크룸의 미러가 아니다.
 * 프리랜서가 자기 관리용으로 표시하는 것이며, 실제 납품·승인·대금은 전부
 * 마켓플레이스에서 일어난다 (04 §1.1).
 */
import { invariant } from '../invariant.ts'

export const SESSION_STATES = [
  'ISSUED',
  'OPENED',
  'IN_PROGRESS',
  'SETTLED',
  'MATCHED',
  'IN_WORK',
  'REVIEW',
  'CLOSED',
  'EXPIRED',
  'ABANDONED',
] as const
export type SessionState = (typeof SESSION_STATES)[number]

export const TRANSITIONS: Readonly<Record<SessionState, readonly SessionState[]>> = Object.freeze({
  ISSUED: ['OPENED', 'EXPIRED'],
  OPENED: ['IN_PROGRESS', 'ABANDONED'],
  IN_PROGRESS: ['SETTLED', 'ABANDONED'],
  SETTLED: ['MATCHED', 'CLOSED'],
  MATCHED: ['IN_WORK', 'CLOSED'],
  IN_WORK: ['REVIEW', 'CLOSED'],
  REVIEW: ['IN_WORK', 'CLOSED'],
  CLOSED: [],
  EXPIRED: [],
  ABANDONED: [],
})

/** 03 §4 — 이후 상태 변화가 없는 종착점. 보존 정책이 여기서 갈린다. */
export function isTerminal(state: SessionState): boolean {
  return TRANSITIONS[state].length === 0
}

export function canTransition(from: SessionState, to: SessionState): boolean {
  return TRANSITIONS[from].includes(to)
}

export function transition(from: SessionState, to: SessionState): SessionState {
  invariant(canTransition(from, to), 'SESSION_TRANSITION_INVALID', `${from} -> ${to}`)
  return to
}

/** 04 §1 보조 상태 */
export const EXPIRE_AFTER_DAYS = 30 // 발급 후 미열람
export const ABANDON_AFTER_DAYS = 7 // 열람 후 무진행

export interface StaleInput {
  readonly state: SessionState
  /** 기준 시각으로부터 경과한 일수 */
  readonly daysSinceIssued: number
  readonly daysSinceLastActivity: number
}

/**
 * 시간 경과로 자동 전이할 상태. 없으면 null.
 * 시계를 주입받지 않는다 — 경과 일수를 받는다. 순수하게 유지하기 위해서다.
 */
export function staleTransition(input: StaleInput): SessionState | null {
  if (input.state === 'ISSUED' && input.daysSinceIssued >= EXPIRE_AFTER_DAYS) return 'EXPIRED'
  if (
    (input.state === 'OPENED' || input.state === 'IN_PROGRESS') &&
    input.daysSinceLastActivity >= ABANDON_AFTER_DAYS
  ) {
    return 'ABANDONED'
  }
  return null
}

/**
 * 04 §5.4 — 영업일이 아니라 절대 시간으로 센다.
 * 국경 간에서는 "영업일"의 정의가 서로 다르다.
 */
export const SLA_HOURS = Object.freeze({
  proReview: 24,
  clientNegotiationResponse: 48,
})
