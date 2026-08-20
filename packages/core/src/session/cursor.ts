/**
 * PAIRWISE 진행 — 05 §6.
 *
 * 서버가 커서를 갖는다. 클라이언트 요청은 { side: 'a' | 'b' } 한 글자뿐이며
 * 자기가 어떤 축을 봤는지조차 말하지 않는다. 임의 조합을 만들 경로가 없다
 * (07 합격 기준 3).
 */
import { invariant } from '../invariant.ts'
import { makePair, serializePair, type Pair, type SerializedPair, type Side } from '../block/pair.ts'
import type { Axis, BlockConfig, SpecLine } from '../block/types.ts'
import type { JsonValue } from '../json.ts'

export interface PairwiseState {
  readonly cursor: number
  readonly total: number
  readonly done: boolean
}

function pairwiseOf(config: BlockConfig): Extract<BlockConfig, { kind: 'PAIRWISE' }> {
  invariant(config.kind === 'PAIRWISE', 'BLOCK_NOT_PAIRWISE', config.kind)
  return config
}

export function progressOf(config: BlockConfig, cursor: number): PairwiseState {
  const total = pairwiseOf(config).axes.length
  return { cursor, total, done: cursor >= total }
}

export function axisAt(config: BlockConfig, cursor: number): Axis | null {
  return pairwiseOf(config).axes[cursor] ?? null
}

export function pairAt(config: BlockConfig, cursor: number): Pair | null {
  const c = pairwiseOf(config)
  const axis = c.axes[cursor]
  return axis === undefined ? null : makePair(c.base, axis)
}

export function serializedPairAt(config: BlockConfig, cursor: number): SerializedPair | null {
  const c = pairwiseOf(config)
  const pair = pairAt(config, cursor)
  return pair === null ? null : serializePair(pair, c.renderer)
}

/**
 * 선택 기록 → 사양 라인.
 *
 * 설계 헌법 5 — 선택 즉시 수치로 고정한다. 선택은 잊히고 수치는 남는다.
 * owner 는 기본 CLIENT 이며, 역제안에서 클라이언트가 keep 을 고르면
 * 그 축만 CLIENT 로 남고 accept 하면 PRO 로 바뀐다 (04 §5.3).
 */
export function linesFromChoices(config: BlockConfig, choices: readonly Side[]): SpecLine[] {
  const c = pairwiseOf(config)
  invariant(choices.length === c.axes.length, 'CHOICES_LENGTH_MISMATCH', `${choices.length}/${c.axes.length}`)
  return c.axes.map((axis, i) => {
    const side = choices[i]!
    return {
      key: axis.nameKey,
      value: axis[side].labelKey,
      measure: axis[side].measure,
      owner: 'CLIENT' as const,
    }
  })
}

/** 확정된 전 축의 합성 값. C-03 상단 미리보기가 이걸 그린다. */
export function composedValues(
  config: BlockConfig,
  choices: readonly Side[],
): Readonly<Record<string, JsonValue>> {
  const c = pairwiseOf(config)
  const out: Record<string, JsonValue> = { ...c.base }
  c.axes.forEach((axis, i) => {
    const side = choices[i]
    if (side !== undefined) out[axis.field] = axis[side].value
  })
  return Object.freeze(out)
}

/**
 * 한 축만 교체한 합성 값. C-04 역제안 비교의 **오른쪽 카드**가 이것이다.
 *
 * composedValues 로 만든 현재 사양에서 제안된 축 하나만 갈아끼운다. 두 장을
 * 따로 조립하지 않는다는 뜻이며, 그래서 "두 축이 동시에 다른 비교"가
 * 여기서도 만들어지지 않는다 (07 합격 기준 3).
 *
 * axisKey 는 Axis.nameKey 다. 해당 축이 없으면 던진다 — 조용히 무시하면
 * 클라이언트가 현재값 두 장을 나란히 보게 되고, 그건 아무 의미도 없는 화면이다.
 *
 * **C-04 는 양쪽 카드를 모두 이 함수로 만든다.** 왼쪽은 클라이언트가 고른 값,
 * 오른쪽은 제안값을 넣는다. composedValues 와 비교하는 형태로 만들면 안 된다 —
 * image 렌더러 프로파일(seo · print)은 전 축이 같은 `src` 필드를 써서
 * composedValues 가 마지막 축의 이미지만 남기고, 그 결과 무관한 두 장이
 * 나란히 뜬다. 양쪽을 같은 방식으로 조립해야 한 필드만 다름이 보장된다.
 */
export function composedWith(
  config: BlockConfig,
  choices: readonly Side[],
  override: { readonly axisKey: string; readonly value: JsonValue },
): Readonly<Record<string, JsonValue>> {
  const c = pairwiseOf(config)
  const axis = c.axes.find((a) => a.nameKey === override.axisKey)
  invariant(axis !== undefined, 'AXIS_NOT_FOUND', override.axisKey)
  return Object.freeze({
    ...composedValues(config, choices),
    [axis.field]: override.value,
  })
}
