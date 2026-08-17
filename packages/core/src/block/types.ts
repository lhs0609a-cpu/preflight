import { z } from 'zod'
import { JsonValueSchema } from '../json.ts'

/** 02 §3 */
export const BLOCK_TYPES = [
  'PAIRWISE',
  'PICK_N',
  'CHECKLIST',
  'SLIDER',
  'ROSTER',
  'UPLOAD',
  'REHEARSAL',
] as const
export const BlockTypeSchema = z.enum(BLOCK_TYPES)
export type BlockType = z.infer<typeof BlockTypeSchema>

/** 02 §4.1 렌더러 표. image 가 확장성의 열쇠다. */
export const RENDERER_IDS = [
  'web',
  'app',
  'video',
  'logo',
  'detail',
  'photo',
  'space',
  'text',
  'package',
  'chart',
  'audio',
  'image',
] as const
export const RendererIdSchema = z.enum(RENDERER_IDS)
export type RendererId = z.infer<typeof RendererIdSchema>

/** 라벨 키는 데이터다 (i18n/labels.ts 주석 참조). 형식만 검사하고 존재는 컴파일 때 본다. */
export const LabelKeyRefSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9_.-]*$/u, 'LABEL_KEY_FORMAT')

export const MeasureSchema = z
  .string()
  .min(1)
  .refine((s) => !/[.?!]\s*$/u.test(s), 'MEASURE_IS_SENTENCE')
  .refine((s) => s.trim().split(/\s+/u).length <= 4, 'MEASURE_TOO_LONG')

export const IconRefSchema = z
  .string()
  .min(1)
  .regex(/^[a-z][a-z0-9-]*$/u, 'ICON_KEY_FORMAT')

// ─── PAIRWISE ────────────────────────────────────────────────────────────────

export const AxisValueSchema = z.object({
  labelKey: LabelKeyRefSchema,
  value: JsonValueSchema,
  measure: MeasureSchema,
  image: z.string().url().optional(),
})
export type AxisValue = z.infer<typeof AxisValueSchema>

export const AxisSchema = z.object({
  /** 08 §3.1-6 — 축 이름은 영문 1단어 */
  nameKey: LabelKeyRefSchema,
  field: z.string().min(1),
  a: AxisValueSchema,
  b: AxisValueSchema,
})
export type Axis = z.infer<typeof AxisSchema>

export const PairwiseConfigSchema = z.object({
  kind: z.literal('PAIRWISE'),
  base: z.record(JsonValueSchema),
  renderer: RendererIdSchema,
  /** 02 §4.1 — 축 3~8개. 8 초과 시 판별 피로 */
  axes: z.array(AxisSchema).min(3).max(8),
  adaptive: z.boolean().optional(),
})

// ─── PICK_N ──────────────────────────────────────────────────────────────────

export const WireRowSchema = z.tuple([z.enum(['h', 'b', 's']), z.number().int().positive()])

export const PickOptionSchema = z.object({
  labelKey: LabelKeyRefSchema,
  icon: IconRefSchema,
  wireframe: z.array(WireRowSchema).optional(),
  image: z.string().url().optional(),
  /** C-06 톤 샘플. 유일하게 영문이 노출되는 자리 (06 §C-06) */
  sample: z.string().optional(),
  measure: MeasureSchema,
})

export const PickNConfigSchema = z.object({
  kind: z.literal('PICK_N'),
  /** 설계 헌법 4 — 3안이 상한 */
  options: z.array(PickOptionSchema).min(2).max(3),
  style: z.enum(['wireframe', 'image', 'sample']),
  fidelity: z.enum(['low', 'high']),
})

// ─── CHECKLIST ───────────────────────────────────────────────────────────────

export const ChecklistItemSchema = z.object({
  labelKey: LabelKeyRefSchema,
  icon: IconRefSchema,
  amountUsd: z.number().nonnegative(),
  weeks: z.number().nonnegative(),
  default: z.boolean(),
  fallbackAmountUsd: z.number().nonnegative().optional(),
  blocksStart: z.boolean().optional(),
})

export const ChecklistConfigSchema = z.object({
  kind: z.literal('CHECKLIST'),
  mode: z.enum(['scope', 'assets']),
  items: z.array(ChecklistItemSchema).min(1),
  baseWeeks: z.number().nonnegative(),
  /** FR-5.2 — 내부 계산은 USD 고정 */
  currency: z.literal('USD'),
})

// ─── SLIDER ──────────────────────────────────────────────────────────────────

export const SliderConfigSchema = z.object({
  kind: z.literal('SLIDER'),
  axisSource: z.literal('locked-axes'),
  min: z.literal(0),
  max: z.literal(100),
  default: z.literal(50),
  /** 문장이 아니라 아이콘 (02 §4.4) */
  endIcons: z.tuple([IconRefSchema, IconRefSchema]),
  strengthBands: z
    .array(z.object({ max: z.number().int().positive(), key: LabelKeyRefSchema }))
    .min(1),
})

// ─── ROSTER / UPLOAD / REHEARSAL ─────────────────────────────────────────────

export const RosterConfigSchema = z.object({
  kind: z.literal('ROSTER'),
  mode: z.enum(['single', 'consensus']),
  maxMembers: z.number().int().positive(),
  compareAxes: z.boolean(),
})

export const UploadConfigSchema = z.object({
  kind: z.literal('UPLOAD'),
  accept: z.array(z.string().min(1)).min(1),
  maxSizeMB: z.number().positive(),
  linkedChecklistId: z.string().optional(),
})

export const REHEARSAL_KINDS = ['test-shot', 'proof-print', 'mockup', 'sample', 'demo-cut'] as const
export const RehearsalKindSchema = z.enum(REHEARSAL_KINDS)
export type RehearsalKind = z.infer<typeof RehearsalKindSchema>

export const RehearsalConfigSchema = z.object({
  kind: z.literal('REHEARSAL'),
  rehearsalKind: RehearsalKindSchema,
  labelKey: LabelKeyRefSchema,
  amountUsd: z.number().nonnegative(),
  blocksPNR: z.literal(true),
  checkpointKeys: z.array(LabelKeyRefSchema),
})

// ─── Block ───────────────────────────────────────────────────────────────────

export const BlockConfigSchema = z.discriminatedUnion('kind', [
  PairwiseConfigSchema,
  PickNConfigSchema,
  ChecklistConfigSchema,
  SliderConfigSchema,
  RosterConfigSchema,
  UploadConfigSchema,
  RehearsalConfigSchema,
])
export type BlockConfig = z.infer<typeof BlockConfigSchema>

export const BlockSchema = z
  .object({
    id: z.string().min(1),
    type: BlockTypeSchema,
    labelKey: LabelKeyRefSchema,
    icon: IconRefSchema,
    /** hard = 확정 후 변경 시 재견적 */
    lock: z.enum(['hard', 'soft']),
    priceImpact: z.boolean(),
    required: z.boolean(),
    config: BlockConfigSchema,
  })
  .refine((b) => b.type === b.config.kind, {
    message: 'BLOCK_TYPE_CONFIG_MISMATCH',
    path: ['config', 'kind'],
  })
export type Block = z.infer<typeof BlockSchema>

// ─── 산출물 (02 §3) ──────────────────────────────────────────────────────────

export const SpecLineSchema = z.object({
  key: LabelKeyRefSchema,
  value: LabelKeyRefSchema,
  /** 번역하지 않는다 */
  measure: MeasureSchema,
  owner: z.enum(['CLIENT', 'PRO']),
})
export type SpecLine = z.infer<typeof SpecLineSchema>

export const BlockOutputSchema = z.object({
  blockId: z.string().min(1),
  lines: z.array(SpecLineSchema),
  lockedAt: z.string().datetime().nullable(),
  amountDeltaUsd: z.number(),
  daysDelta: z.number().int(),
})
export type BlockOutput = z.infer<typeof BlockOutputSchema>

/** 04 §2 */
export const BLOCK_STATES = ['LOCKED_OUT', 'OPEN', 'SUBMITTED', 'SETTLED'] as const
export const BlockStateSchema = z.enum(BLOCK_STATES)
export type BlockState = z.infer<typeof BlockStateSchema>
