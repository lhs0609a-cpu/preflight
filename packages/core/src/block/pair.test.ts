import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { assertAxisValid, cardOf, cardsOf, diffKeys, makePair, serializePair } from './pair.ts'
import type { Axis } from './types.ts'
import { InvariantError } from '../invariant.ts'
import type { JsonValue } from '../json.ts'

const KEY_POOL = ['pad', 'sat', 'sf', 'rows', 'radius', 'hero', 'tone', 'grid'] as const

const arbScalar = fc.oneof(
  fc.integer({ min: -100, max: 100 }),
  fc.string({ maxLength: 8 }),
  fc.boolean(),
)

const arbCase = fc
  .uniqueArray(fc.constantFrom(...KEY_POOL), { minLength: 1, maxLength: KEY_POOL.length })
  .chain((keys) =>
    fc.record({
      base: fc.record(Object.fromEntries(keys.map((k) => [k, arbScalar]))),
      field: fc.constantFrom(...keys),
      va: arbScalar,
      vb: arbScalar,
    }),
  )
  .filter(({ va, vb }) => va !== vb)

function axisOf(field: string, va: JsonValue, vb: JsonValue): Axis {
  return {
    nameKey: field,
    field,
    a: { labelKey: 'a_label', value: va, measure: 'unit 1' },
    b: { labelKey: 'b_label', value: vb, measure: 'unit 2' },
  }
}

describe('makePair — 합격 기준 3', () => {
  it('임의의 base × 임의의 축에 대해 두 카드의 차이는 항상 정확히 1개 필드', () => {
    fc.assert(
      fc.property(arbCase, ({ base, field, va, vb }) => {
        const pair = makePair(base, axisOf(field, va, vb))
        const [a, b] = cardsOf(pair)
        expect(diffKeys(a, b)).toEqual([field])
      }),
      { numRuns: 500 },
    )
  })

  it('카드는 base 의 나머지 필드를 그대로 물려받는다', () => {
    fc.assert(
      fc.property(arbCase, ({ base, field, va, vb }) => {
        const pair = makePair(base, axisOf(field, va, vb))
        for (const side of ['a', 'b'] as const) {
          const card = cardOf(pair, side)
          for (const [k, v] of Object.entries(base)) {
            if (k === field) continue
            expect(card[k]).toEqual(v)
          }
        }
      }),
      { numRuns: 200 },
    )
  })

  it('cardOf 는 축 필드에 해당 side 의 값을 넣는다', () => {
    const pair = makePair({ pad: 12, sf: 0 }, axisOf('pad', 32, 12))
    expect(cardOf(pair, 'a')['pad']).toBe(32)
    expect(cardOf(pair, 'b')['pad']).toBe(12)
  })

  it('Pair 와 파생 카드는 동결된다', () => {
    const pair = makePair({ pad: 12 }, axisOf('pad', 32, 12))
    expect(Object.isFrozen(pair)).toBe(true)
    expect(Object.isFrozen(pair.base)).toBe(true)
    expect(Object.isFrozen(cardOf(pair, 'a'))).toBe(true)
  })

  it('base 를 나중에 바꿔도 이미 만든 Pair 는 영향받지 않는다', () => {
    const base: Record<string, JsonValue> = { pad: 12, sf: 0 }
    const pair = makePair(base, axisOf('pad', 32, 12))
    base['sf'] = 1
    expect(cardOf(pair, 'a')['sf']).toBe(0)
  })
})

describe('assertAxisValid', () => {
  it('base 에 없는 field 는 거부', () => {
    expect(() => makePair({ pad: 12 }, axisOf('sat', 1, 2))).toThrow(InvariantError)
    expect(() => makePair({ pad: 12 }, axisOf('sat', 1, 2))).toThrow(/AXIS_FIELD_NOT_IN_BASE/u)
  })

  it('양극이 같으면 축이 아니다', () => {
    expect(() => makePair({ pad: 12 }, axisOf('pad', 32, 32))).toThrow(/AXIS_NO_CONTRAST/u)
  })

  it('measure 없는 축은 로딩 자체가 실패한다 (L-3)', () => {
    const axis = axisOf('pad', 32, 12)
    const broken: Axis = { ...axis, a: { ...axis.a, measure: '   ' } }
    expect(() => assertAxisValid({ pad: 12 }, broken)).toThrow(/MEASURE_REQUIRED/u)
  })

  it('축 이름은 영문 1단어여야 한다', () => {
    const axis = axisOf('pad', 32, 12)
    const broken: Axis = { ...axis, nameKey: 'cut pace' }
    expect(() => assertAxisValid({ pad: 12 }, broken)).toThrow(/AXIS_NAME_NOT_SINGLE_WORD/u)
  })
})

describe('serializePair — 05 §6', () => {
  it('두 values 는 축 필드 하나만 다르다', () => {
    const pair = makePair({ pad: 32, c: '#7E8F86', sf: 1, rows: 2 }, axisOf('sf', 1, 0))
    const out = serializePair(pair, 'web')
    expect(out.axisKey).toBe('sf')
    expect(out.pair.map((p) => p.side)).toEqual(['a', 'b'])
    const [a, b] = out.pair
    expect(diffKeys(a!.values, b!.values)).toEqual(['sf'])
  })
})
