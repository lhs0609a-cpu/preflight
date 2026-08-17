/**
 * 카드 쌍.
 *
 * 07 합격 기준 3 — "두 축이 동시에 다른 쌍이 구조적으로 발생 불가능".
 *
 * 규칙으로는 지킬 수 없다. 두 카드를 각각 담는 자료구조가 존재하는 한
 * 언젠가 둘을 따로 조립하는 코드가 생긴다.
 *
 * 그래서 쌍을 두 개로 저장하지 않는다.
 * Pair 는 base 하나 + axis 하나만 갖고, 카드는 cardOf() 로 그 자리에서 파생된다.
 * 두 카드가 두 축에서 다르려면 base 가 두 개여야 하는데 필드가 하나뿐이다.
 * → "두 축이 다른 쌍"은 이 타입으로 표현 자체가 불가능하다.
 */
import { deepEqual, type JsonValue } from '../json.ts'
import { invariant, wordCount } from '../invariant.ts'
import type { Axis, RendererId } from './types.ts'

export type Base = Readonly<Record<string, JsonValue>>

declare const CardBrand: unique symbol

/**
 * 카드 한 장의 렌더 입력.
 * 브랜드 타입 — 외부에서 객체 리터럴로 만들 수 없다. 유일한 생성 경로는 cardOf().
 */
export type CardValues = Base & { readonly [CardBrand]: true }

export type Side = 'a' | 'b'
export const SIDES: readonly Side[] = ['a', 'b']

export interface Pair {
  readonly base: Base
  readonly axis: Readonly<Axis>
}

export function assertAxisValid(base: Base, axis: Axis): void {
  invariant(axis.field in base, 'AXIS_FIELD_NOT_IN_BASE', `${axis.nameKey}.${axis.field}`)
  // 양극이 같으면 축이 아니다 (08 §3.1-4)
  invariant(!deepEqual(axis.a.value, axis.b.value), 'AXIS_NO_CONTRAST', axis.nameKey)
  // L-3 — measure 가 없으면 언어로 설명해야 하고 그 순간 무언어가 무너진다
  invariant(axis.a.measure.trim().length > 0, 'MEASURE_REQUIRED', `${axis.nameKey}.a`)
  invariant(axis.b.measure.trim().length > 0, 'MEASURE_REQUIRED', `${axis.nameKey}.b`)
  // 08 §3.1-6 — 축 이름은 영문 1단어
  invariant(wordCount(axis.nameKey) === 1, 'AXIS_NAME_NOT_SINGLE_WORD', axis.nameKey)
}

/** 카드 쌍을 만드는 유일한 경로. */
export function makePair(base: Base, axis: Axis): Pair {
  assertAxisValid(base, axis)
  return Object.freeze({
    base: Object.freeze({ ...base }),
    axis: Object.freeze(axis),
  })
}

/** 카드는 저장되지 않는다. 필요할 때 base 에서 축 필드 하나만 덮어써 파생된다. */
export function cardOf(pair: Pair, side: Side): CardValues {
  return Object.freeze({
    ...pair.base,
    [pair.axis.field]: pair.axis[side].value,
  }) as CardValues
}

/** 테스트·렌더 편의. 여전히 파생이며 저장되지 않는다. */
export function cardsOf(pair: Pair): readonly [CardValues, CardValues] {
  return [cardOf(pair, 'a'), cardOf(pair, 'b')]
}

export function diffKeys(a: Base, b: Base): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys]
    .filter((k) => !deepEqual((a[k] ?? null) as JsonValue, (b[k] ?? null) as JsonValue))
    .sort()
}

/**
 * 05 §6 응답 형태.
 * 요청은 { side: 'a' | 'b' } 뿐이다 — 클라이언트는 자기가 무엇을 골랐는지
 * 값으로 말하지 않는다. 서버의 cursor 가 어떤 축인지 알고 있다.
 */
export interface SerializedPair {
  readonly axisKey: string
  readonly renderer: RendererId
  readonly pair: readonly {
    readonly side: Side
    readonly labelKey: string
    readonly values: Base
  }[]
}

export function serializePair(pair: Pair, renderer: RendererId): SerializedPair {
  return {
    axisKey: pair.axis.nameKey,
    renderer,
    pair: SIDES.map((side) => ({
      side,
      labelKey: pair.axis[side].labelKey,
      values: cardOf(pair, side),
    })),
  }
}
