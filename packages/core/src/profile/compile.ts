/**
 * 프로파일 컴파일 — 12 §4.2 · §4.3.
 *
 *   ProfileSource (JSON, 사람이 씀)
 *         │  compileProfile()
 *         ▼
 *   CompiledProfile (정책 파생 · 리허설 주입 완료)
 *
 * 이 분리가 07 합격 기준 4의 전부다.
 * 리허설 블록을 프로파일 JSON 에 직접 적으면 reversibility 를 바꿔도
 * 아무 일이 안 일어난다.
 */
import { invariant } from '../invariant.ts'
import { makePair } from '../block/pair.ts'
import type { Block, RendererId } from '../block/types.ts'
import { derivePolicy, type DerivedPolicy } from '../policy/reversibility.ts'
import {
  ProfileSourceSchema,
  type ProfileSource,
  type ProOpinion,
  type RehearsalParams,
  type Reversibility,
} from './schema.ts'

export interface CompiledProfile {
  readonly slug: string
  readonly nameKey: string
  readonly version: number
  readonly visibility: 'system' | 'private' | 'public'
  readonly authorId?: string | undefined
  readonly reversibility: Reversibility
  readonly marketplace: ProfileSource['marketplace']
  readonly policy: DerivedPolicy
  /** 블록 실행 순서. 블록 id 와 1:1 이다. */
  readonly flow: readonly string[]
  readonly blocks: readonly Block[]
  readonly opinions: readonly ProOpinion[]
}

/** 렌더러가 해석하는 필드 목록. core 는 render 를 import 하지 않으므로 주입받는다. */
export type FieldLookup = (id: RendererId) => Readonly<Record<string, unknown>> | undefined

export interface CompileOptions {
  /** 로케일 번들에 실린 키 집합. 주면 미등록 라벨을 컴파일에서 잡는다. */
  readonly labelKeys?: ReadonlySet<string>
  /** 주면 축 field 가 렌더러 지원 범위 밖일 때 컴파일에서 잡는다. */
  readonly rendererFields?: FieldLookup
  /** 아이콘 등록소. 주면 06 §5.4 금지 목록을 데이터 작성 프로파일에도 강제한다. */
  readonly iconKeys?: ReadonlySet<string>
}

function collectIconKeys(src: ProfileSource): string[] {
  const icons: string[] = []
  for (const block of src.blocks) {
    icons.push(block.icon)
    const c = block.config
    if (c.kind === 'PICK_N') for (const o of c.options) icons.push(o.icon)
    if (c.kind === 'CHECKLIST') for (const i of c.items) icons.push(i.icon)
    if (c.kind === 'SLIDER') icons.push(...c.endIcons)
  }
  return [...new Set(icons)]
}

/** 프로파일이 참조하는 라벨 키 전부. 로케일 번들과 대조한다. */
export function collectLabelKeys(src: ProfileSource): string[] {
  const keys: string[] = [src.nameKey]
  if (src.policy.pointOfNoReturnKey) keys.push(src.policy.pointOfNoReturnKey)
  if (src.rehearsal) keys.push(src.rehearsal.labelKey, ...src.rehearsal.checkpointKeys)

  for (const block of src.blocks) {
    keys.push(block.labelKey)
    const c = block.config
    switch (c.kind) {
      case 'PAIRWISE':
        for (const axis of c.axes) keys.push(axis.nameKey, axis.a.labelKey, axis.b.labelKey)
        break
      case 'PICK_N':
        for (const o of c.options) keys.push(o.labelKey)
        break
      case 'CHECKLIST':
        for (const i of c.items) keys.push(i.labelKey)
        break
      case 'SLIDER':
        for (const b of c.strengthBands) keys.push(b.key)
        break
      case 'REHEARSAL':
        keys.push(c.labelKey, ...c.checkpointKeys)
        break
      case 'ROSTER':
      case 'UPLOAD':
        break
    }
  }
  return [...new Set(keys)]
}

function assertAxes(src: ProfileSource): void {
  for (const block of src.blocks) {
    if (block.config.kind !== 'PAIRWISE') continue
    for (const axis of block.config.axes) {
      // makePair 가 축 불변식을 전부 검사한다 (base 포함 여부 · 대비 · measure · 1단어)
      makePair(block.config.base, axis)
    }
  }
}

function assertRendererFields(src: ProfileSource, lookup: FieldLookup): void {
  for (const block of src.blocks) {
    if (block.config.kind !== 'PAIRWISE') continue
    const { renderer, base, axes } = block.config
    const fields = lookup(renderer)
    invariant(fields !== undefined, 'RENDERER_NOT_FOUND', renderer)
    for (const key of Object.keys(base)) {
      invariant(key in fields, 'BASE_FIELD_UNSUPPORTED', `${renderer}.${key}`)
    }
    for (const axis of axes) {
      invariant(axis.field in fields, 'AXIS_FIELD_UNSUPPORTED', `${renderer}.${axis.field}`)
    }
  }
}

function assertLabelKeys(src: ProfileSource, registered: ReadonlySet<string>): void {
  const missing = collectLabelKeys(src).filter((k) => !registered.has(k))
  invariant(missing.length === 0, 'LABEL_KEY_UNREGISTERED', missing.join(', '))
}

function assertFlowMatchesBlocks(flow: readonly string[], blocks: readonly Block[]): void {
  const ids = blocks.map((b) => b.id)
  invariant(new Set(ids).size === ids.length, 'BLOCK_ID_DUPLICATE')
  const a = [...flow].sort().join(',')
  const b = [...ids].sort().join(',')
  invariant(a === b, 'FLOW_BLOCK_MISMATCH', `flow=[${flow.join(',')}] blocks=[${ids.join(',')}]`)
}

export const REHEARSAL_BLOCK_ID = 'rehearsal'

function rehearsalBlock(params: RehearsalParams): Block {
  return {
    id: REHEARSAL_BLOCK_ID,
    type: 'REHEARSAL',
    labelKey: params.labelKey,
    icon: 'check',
    lock: 'hard',
    priceImpact: true,
    required: true,
    config: {
      kind: 'REHEARSAL',
      rehearsalKind: params.kind,
      labelKey: params.labelKey,
      amountUsd: params.amountUsd,
      blocksPNR: true,
      checkpointKeys: params.checkpointKeys,
    },
  }
}

/**
 * 리허설은 범위 조립 **앞**에 꽂는다.
 * 되돌림 한계점 이전에 실물 확인을 강제하는 것이 목적이므로(02 §4.7),
 * 금액이 확정되는 자리보다 앞이어야 한다.
 */
function insertionIndex(blocks: readonly Block[]): number {
  const i = blocks.findIndex((b) => b.config.kind === 'CHECKLIST' && b.config.mode === 'scope')
  return i === -1 ? blocks.length : i
}

export function compileProfile(source: unknown, opts: CompileOptions = {}): CompiledProfile {
  const src = ProfileSourceSchema.parse(source)

  assertAxes(src)
  if (opts.rendererFields) assertRendererFields(src, opts.rendererFields)
  if (opts.labelKeys) assertLabelKeys(src, opts.labelKeys)
  if (opts.iconKeys) {
    const unknown = collectIconKeys(src).filter((i) => !opts.iconKeys!.has(i))
    invariant(unknown.length === 0, 'ICON_UNREGISTERED', unknown.join(', '))
  }

  const policy = derivePolicy(src.reversibility, src.policy)

  let blocks: Block[] = [...src.blocks]
  let flow: string[] = src.flow.map((f) => f.key)
  assertFlowMatchesBlocks(flow, blocks)

  if (policy.rehearsal === 'required') {
    const already = blocks.some((b) => b.config.kind === 'REHEARSAL')
    if (!already) {
      invariant(src.rehearsal !== undefined, 'REHEARSAL_PARAMS_REQUIRED', src.slug)
      const at = insertionIndex(blocks)
      blocks = [...blocks.slice(0, at), rehearsalBlock(src.rehearsal), ...blocks.slice(at)]
      flow = [...flow.slice(0, at), REHEARSAL_BLOCK_ID, ...flow.slice(at)]
    }
  }

  assertFlowMatchesBlocks(flow, blocks)

  return Object.freeze({
    slug: src.slug,
    nameKey: src.nameKey,
    version: src.version,
    visibility: src.visibility,
    authorId: src.authorId,
    reversibility: src.reversibility,
    marketplace: Object.freeze(src.marketplace),
    policy,
    flow: Object.freeze(flow),
    blocks: Object.freeze(blocks),
    opinions: Object.freeze(src.opinions),
  })
}
