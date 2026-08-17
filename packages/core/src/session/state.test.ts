import { describe, expect, it } from 'vitest'
import {
  SESSION_STATES,
  TRANSITIONS,
  canTransition,
  isTerminal,
  staleTransition,
  transition,
} from './state.ts'

describe('세션 상태 머신 — 04 §1.1', () => {
  it('문서의 전이표를 그대로 따른다', () => {
    expect(canTransition('ISSUED', 'OPENED')).toBe(true)
    expect(canTransition('OPENED', 'IN_PROGRESS')).toBe(true)
    expect(canTransition('IN_PROGRESS', 'SETTLED')).toBe(true)
    expect(canTransition('SETTLED', 'MATCHED')).toBe(true)
    expect(canTransition('MATCHED', 'IN_WORK')).toBe(true)
    expect(canTransition('IN_WORK', 'REVIEW')).toBe(true)
    expect(canTransition('REVIEW', 'IN_WORK')).toBe(true)
  })

  it('건너뛰기를 막는다', () => {
    expect(canTransition('ISSUED', 'SETTLED')).toBe(false)
    expect(canTransition('OPENED', 'MATCHED')).toBe(false)
    expect(() => transition('ISSUED', 'MATCHED')).toThrow(/SESSION_TRANSITION_INVALID/u)
  })

  it('되돌아가지 않는다', () => {
    expect(canTransition('SETTLED', 'IN_PROGRESS')).toBe(false)
    expect(canTransition('MATCHED', 'SETTLED')).toBe(false)
  })

  it('종착 상태에서는 나갈 수 없다', () => {
    for (const s of ['CLOSED', 'EXPIRED', 'ABANDONED'] as const) {
      expect(isTerminal(s)).toBe(true)
    }
  })

  it('모든 상태가 전이표에 있고, 전이 대상도 전부 알려진 상태다', () => {
    for (const s of SESSION_STATES) {
      expect(TRANSITIONS[s]).toBeDefined()
      for (const to of TRANSITIONS[s]) expect(SESSION_STATES).toContain(to)
    }
  })
})

describe('시간 경과 전이 — 04 §1', () => {
  it('발급 후 30일 미열람이면 EXPIRED', () => {
    expect(
      staleTransition({ state: 'ISSUED', daysSinceIssued: 30, daysSinceLastActivity: 30 }),
    ).toBe('EXPIRED')
    expect(
      staleTransition({ state: 'ISSUED', daysSinceIssued: 29, daysSinceLastActivity: 29 }),
    ).toBeNull()
  })

  it('열람 후 7일 무진행이면 ABANDONED — 전환율 분석 대상', () => {
    expect(
      staleTransition({ state: 'OPENED', daysSinceIssued: 8, daysSinceLastActivity: 7 }),
    ).toBe('ABANDONED')
    expect(
      staleTransition({ state: 'IN_PROGRESS', daysSinceIssued: 40, daysSinceLastActivity: 7 }),
    ).toBe('ABANDONED')
  })

  it('확정된 세션은 방치돼도 버려지지 않는다', () => {
    expect(
      staleTransition({ state: 'SETTLED', daysSinceIssued: 400, daysSinceLastActivity: 400 }),
    ).toBeNull()
  })
})
