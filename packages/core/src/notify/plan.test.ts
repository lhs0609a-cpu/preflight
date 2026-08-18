import { describe, expect, it } from 'vitest'
import { deliveryPlan, groupDigest, localParts, type Notification } from './plan.ts'

const QUIET = { from: '23:00', to: '07:00', mode: 'digest' as const }

describe('시차 인지 알림 — FR-12.3 · 05 §12', () => {
  it('깨어 있는 시간이면 즉시 보낸다', () => {
    // 2026-09-02T05:00Z = 서울 14:00
    const p = deliveryPlan({
      atUtcIso: '2026-09-02T05:00:00.000Z',
      timezone: 'Asia/Seoul',
      quietHours: QUIET,
    })
    expect(p).toEqual({ deliver: 'now' })
  })

  it('취침 시간대면 버리지 않고 기상 시각으로 묶는다', () => {
    // 2026-09-02T16:00Z = 서울 다음날 01:00 → 조용한 시간
    const p = deliveryPlan({
      atUtcIso: '2026-09-02T16:00:00.000Z',
      timezone: 'Asia/Seoul',
      quietHours: QUIET,
    })
    expect(p.deliver).toBe('digest')
    if (p.deliver !== 'digest') throw new Error('unexpected')
    // 서울 07:00 = 전날 22:00 UTC
    expect(localParts(p.atUtcIso, 'Asia/Seoul')).toMatchObject({ minutes: 7 * 60 })
  })

  it('자정 직전 이벤트는 다음 날 아침으로 넘어간다', () => {
    // 2026-09-02T14:30Z = 서울 23:30
    const p = deliveryPlan({
      atUtcIso: '2026-09-02T14:30:00.000Z',
      timezone: 'Asia/Seoul',
      quietHours: QUIET,
    })
    if (p.deliver !== 'digest') throw new Error('unexpected')
    const at = localParts(p.atUtcIso, 'Asia/Seoul')
    expect(at.minutes).toBe(7 * 60)
    expect(at.date).toBe('2026-09-03')
  })

  it('타임존이 다르면 결과도 다르다 — 같은 순간, 다른 판단', () => {
    const at = '2026-09-02T16:00:00.000Z'
    expect(deliveryPlan({ atUtcIso: at, timezone: 'Asia/Seoul', quietHours: QUIET }).deliver).toBe('digest')
    // 같은 순간이 마닐라 00:00 → 조용, 키이우 19:00 → 활동 시간
    expect(deliveryPlan({ atUtcIso: at, timezone: 'Europe/Kyiv', quietHours: QUIET }).deliver).toBe('now')
  })

  it('설정이 없으면 항상 즉시', () => {
    expect(deliveryPlan({ atUtcIso: '2026-09-02T16:00:00.000Z', timezone: 'Asia/Seoul' })).toEqual({
      deliver: 'now',
    })
  })

  it('긴급 알림은 조용한 시간에도 나간다', () => {
    const p = deliveryPlan({
      atUtcIso: '2026-09-02T16:00:00.000Z',
      timezone: 'Asia/Seoul',
      quietHours: QUIET,
      urgent: true,
    })
    expect(p).toEqual({ deliver: 'now' })
  })

  it('silent 모드는 버린다', () => {
    const p = deliveryPlan({
      atUtcIso: '2026-09-02T16:00:00.000Z',
      timezone: 'Asia/Seoul',
      quietHours: { ...QUIET, mode: 'silent' },
    })
    expect(p).toEqual({ deliver: 'drop' })
  })

  it('잘못된 설정은 거부한다', () => {
    expect(() =>
      deliveryPlan({
        atUtcIso: '2026-09-02T16:00:00.000Z',
        timezone: 'Asia/Seoul',
        quietHours: { from: '25:00', to: '07:00', mode: 'digest' },
      }),
    ).toThrow(/QUIET_HOURS/u)
  })
})

describe('요약 묶기 — 취침 중 이벤트를 잃지 않는다', () => {
  it('같은 기상 시각의 알림이 하나로 묶인다', () => {
    const mk = (kind: Notification['kind'], at: string): Notification => ({
      kind,
      sessionNo: 'PF-2609-0142',
      atUtcIso: at,
      summaryKey: `evt.${kind}`,
    })
    const items = [
      mk('link.opened', '2026-09-02T16:00:00.000Z'),
      mk('block.settled', '2026-09-02T17:30:00.000Z'),
      mk('spec.settled', '2026-09-02T05:00:00.000Z'), // 활동 시간 → 즉시
    ].map((n) => ({
      notification: n,
      plan: deliveryPlan({ atUtcIso: n.atUtcIso, timezone: 'Asia/Seoul', quietHours: QUIET }),
    }))

    const grouped = groupDigest(items)
    expect(grouped.size).toBe(1)
    expect([...grouped.values()][0]).toHaveLength(2)
  })
})
