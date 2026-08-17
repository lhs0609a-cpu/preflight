import { describe, expect, it } from 'vitest'
import { REVERSIBILITY_POLICY, derivePolicy } from './reversibility.ts'
import { compileProfile } from '../profile/compile.ts'
import type { Reversibility } from '../profile/schema.ts'

/** 렌더러·번들 없이 컴파일 경로만 보는 최소 프로파일. */
function sourceOf(reversibility: Reversibility): Record<string, unknown> {
  return {
    slug: 'fixture',
    nameKey: 'profile.web',
    version: 1,
    visibility: 'system',
    reversibility,
    marketplace: {
      categoryHints: ['x'],
      offerTemplate: 'offer.v1',
      listingTemplate: 'listing.v1',
    },
    policy: {},
    rehearsal: {
      kind: 'mockup',
      labelKey: 'rehearsal.testshot',
      amountUsd: 40,
      checkpointKeys: [],
    },
    flow: [{ key: 'taste' }, { key: 'scope' }],
    blocks: [
      {
        id: 'taste',
        type: 'PAIRWISE',
        labelKey: 'block.taste',
        icon: 'scale',
        lock: 'hard',
        priceImpact: false,
        required: true,
        config: {
          kind: 'PAIRWISE',
          renderer: 'web',
          base: { pad: 32, rows: 2, radius: 0 },
          axes: [
            {
              nameKey: 'spacing',
              field: 'pad',
              a: { labelKey: 'wide', value: 32, measure: 'padding 32px' },
              b: { labelKey: 'tight', value: 12, measure: 'padding 12px' },
            },
            {
              nameKey: 'density',
              field: 'rows',
              a: { labelKey: 'low', value: 2, measure: '2 blocks' },
              b: { labelKey: 'high', value: 6, measure: '6 blocks' },
            },
            {
              nameKey: 'corner',
              field: 'radius',
              a: { labelKey: 'sharp', value: 0, measure: 'radius 0px' },
              b: { labelKey: 'round', value: 12, measure: 'radius 12px' },
            },
          ],
        },
      },
      {
        id: 'scope',
        type: 'CHECKLIST',
        labelKey: 'block.scope',
        icon: 'file',
        lock: 'hard',
        priceImpact: true,
        required: true,
        config: {
          kind: 'CHECKLIST',
          mode: 'scope',
          currency: 'USD',
          baseWeeks: 2,
          items: [
            { labelKey: 'scope.main', icon: 'grid', amountUsd: 180, weeks: 2, default: true },
          ],
        },
      },
    ],
    opinions: [],
  }
}

const omit = <T extends object>(o: T, keys: string[]): Record<string, unknown> =>
  Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)))

describe('derivePolicy — 02 §6 · 04 §3.1', () => {
  it('세 값이 서로 다른 정책을 만든다', () => {
    expect(derivePolicy('cheap').rehearsal).toBe('none')
    expect(derivePolicy('gated').rehearsal).toBe('required')
    expect(derivePolicy('outcome').rehearsal).toBe('none')

    expect(derivePolicy('cheap').revisionMode).toBe('counted')
    expect(derivePolicy('gated').revisionMode).toBe('until-pnr')
    expect(derivePolicy('outcome').revisionMode).toBe('per-cycle')
  })

  it('PNR 이 없는 유형은 pointOfNoReturnKey 를 가질 수 없다', () => {
    const p = derivePolicy('cheap', { pointOfNoReturnKey: 'pnr.shootend', pnrStageIndex: 2 })
    expect(p.pnr).toBe('none')
    expect(p.pointOfNoReturnKey).toBeNull()
    expect(p.pnrStageIndex).toBeNull()
  })

  it('오버라이드는 수치만 바꾼다', () => {
    const p = derivePolicy('gated', { revisionCount: 5 })
    expect(p.revisionCount).toBe(5)
    expect(p.rehearsal).toBe(REVERSIBILITY_POLICY.gated.rehearsal)
    expect(p.craftClause).toBe(REVERSIBILITY_POLICY.gated.craftClause)
  })
})

describe('07 합격 기준 4 — reversibility 한 값만 바꾸면', () => {
  const cheap = compileProfile(sourceOf('cheap'))
  const gated = compileProfile(sourceOf('gated'))
  const outcome = compileProfile(sourceOf('outcome'))

  it('gated 에만 REHEARSAL 이 주입된다', () => {
    expect(cheap.blocks.map((b) => b.type)).not.toContain('REHEARSAL')
    expect(gated.blocks.map((b) => b.type)).toContain('REHEARSAL')
    expect(outcome.blocks.map((b) => b.type)).not.toContain('REHEARSAL')
  })

  it('리허설은 범위 조립 앞에 꽂힌다 — 금액 확정보다 먼저', () => {
    expect(gated.flow).toEqual(['taste', 'rehearsal', 'scope'])
  })

  it('gated 만 PNR 을 막는다', () => {
    expect(cheap.policy.pnr).toBe('none')
    expect(gated.policy.pnr).toBe('blocking')
  })

  it('**정책만** 바뀐다 — 나머지는 완전히 동일하다', () => {
    const ignore = ['policy', 'blocks', 'flow', 'reversibility']
    expect(omit(gated, ignore)).toEqual(omit(cheap, ignore))
    expect(omit(outcome, ignore)).toEqual(omit(cheap, ignore))
  })

  it('gated 인데 리허설 파라미터가 없으면 컴파일이 실패한다', () => {
    const src = sourceOf('gated')
    delete src['rehearsal']
    expect(() => compileProfile(src)).toThrow(/REHEARSAL_PARAMS_REQUIRED/u)
  })
})
