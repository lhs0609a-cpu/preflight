import { describe, expect, it } from 'vitest'
import { judge, repeatFlag, type RequestSignals } from './judge.ts'

const CONFIG = { requoteUsd: 120, requoteDays: 2, outOfScopeUsd: 18 }
const R = { used: 1, total: 3 }
const j = (s: RequestSignals, rev = R) => judge(s, rev, CONFIG)

describe('수정 판정 — 04 §4.1', () => {
  it('기준 위반은 무상이고 횟수를 차감하지 않는다', () => {
    const v = j({ basis: 'off' })
    expect(v.outcome).toEqual({ kind: 'free', iconKey: 'shield', revisionsAfter: R })
  })

  it('취향 변경은 1회 차감', () => {
    const v = j({ basis: 'taste' })
    expect(v.outcome).toMatchObject({ kind: 'counted', revisionsAfter: { used: 2, total: 3 } })
  })

  it('방향 변경은 재견적', () => {
    const v = j({ basis: 'change' })
    expect(v.outcome).toMatchObject({ kind: 'requote', quoteUsd: 120, daysDelta: 2 })
  })
})

describe('자동 재분류 — 04 §4.3', () => {
  it('전체 구성 30% 초과 변경이면 방향 변경으로 올라간다', () => {
    const v = j({ basis: 'taste', changeRatio: 0.41 })
    expect(v.basis).toBe('change')
    expect(v.reclassifiedFrom).toBe('taste')
    expect(v.outcome.kind).toBe('requote')
  })

  it('30% 이하는 그대로 취향 변경', () => {
    expect(j({ basis: 'taste', changeRatio: 0.3 }).basis).toBe('taste')
  })

  it('순서 변경이 포함되면 방향 변경', () => {
    expect(j({ basis: 'taste', orderChanged: true }).basis).toBe('change')
  })

  it('확정 축 3개 이상 동시 지적이면 방향 변경', () => {
    expect(j({ basis: 'taste', axesTouched: 3 }).basis).toBe('change')
    expect(j({ basis: 'taste', axesTouched: 2 }).basis).toBe('taste')
  })

  it('톤·구조 교체는 방향 변경', () => {
    expect(j({ basis: 'taste', toneOrStructureSwap: true }).basis).toBe('change')
  })

  it('기준 위반은 재분류하지 않는다 — 명세를 어긴 쪽에 비용을 되돌리지 않는다', () => {
    const v = j({ basis: 'off', changeRatio: 0.9, orderChanged: true, axesTouched: 5 })
    expect(v.basis).toBe('off')
    expect(v.reclassifiedFrom).toBeNull()
    expect(v.outcome.kind).toBe('free')
  })
})

describe('경계', () => {
  it('남은 횟수가 없으면 차감 대신 재견적으로 넘어간다', () => {
    const v = j({ basis: 'taste' }, { used: 3, total: 3 })
    expect(v.basis).toBe('change')
    expect(v.reclassifiedFrom).toBe('taste')
    expect(v.outcome.kind).toBe('requote')
  })

  it('PNR 통과 후에는 수정이 아니라 신규 발주다', () => {
    expect(j({ basis: 'taste', pnrPassed: true }).outcome.kind).toBe('new-session')
  })

  it('명세 밖 항목은 자동 견적 후 승인 대기', () => {
    const v = j({ basis: 'taste', outOfScope: true })
    expect(v.tag).toBe('OUT_OF_SCOPE')
    expect(v.outcome).toMatchObject({ kind: 'out-of-scope', quoteUsd: 18 })
  })

  it('같은 대상 3회 이상이면 축이 잘못 잡힌 것이다 (04 §4.5)', () => {
    expect(repeatFlag(2)).toBe(false)
    expect(repeatFlag(3)).toBe(true)
  })
})
