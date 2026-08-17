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
): Readonly<Record<string, unknown>> {
  const c = pairwiseOf(config)
  const out: Record<string, unknown> = { ...c.base }
  c.axes.forEach((axis, i) => {
    const side = choices[i]
    if (side !== undefined) out[axis.field] = axis[side].value
  })
  return Object.freeze(out)
}
