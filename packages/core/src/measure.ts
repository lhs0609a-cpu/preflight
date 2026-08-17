import { invariant, wordCount } from './invariant.ts'

declare const MeasureBrand: unique symbol

/**
 * 측정값. 02 §3 — 양측이 같은 것을 보는 유일한 근거이며 번역하지 않는다.
 *
 * 브랜드 타입이라 일반 string 을 그대로 대입할 수 없고,
 * LabelKey 유니온에도 대입되지 않으므로 t() 에 넘길 수 없다.
 */
export type Measure = string & { readonly [MeasureBrand]: true }

/** measure 는 문장이 아니다. 값과 단위다. */
const MAX_MEASURE_TOKENS = 4

export function measure(raw: string): Measure {
  const s = raw.trim()
  invariant(s.length > 0, 'MEASURE_EMPTY')
  invariant(!/[.?!]\s*$/u.test(s), 'MEASURE_IS_SENTENCE', s)
  invariant(wordCount(s) <= MAX_MEASURE_TOKENS, 'MEASURE_TOO_LONG', s)
  return s as Measure
}

export function isMeasure(raw: string): boolean {
  try {
    measure(raw)
    return true
  } catch {
    return false
  }
}
