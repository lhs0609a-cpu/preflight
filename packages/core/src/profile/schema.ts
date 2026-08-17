import { z } from 'zod'
import { BlockSchema, LabelKeyRefSchema } from '../block/types.ts'

/** 00 §2.4 — 이 한 필드가 나머지 정책을 결정한다. */
export const REVERSIBILITY = ['cheap', 'gated', 'outcome'] as const
export const ReversibilitySchema = z.enum(REVERSIBILITY)
export type Reversibility = z.infer<typeof ReversibilitySchema>

export const ProOpinionSchema = z.object({
  axisName: z.string().min(1),
  want: z.string().min(1),
  /** 프리랜서 화면·로그에만 남는다 (04 §5.1) */
  sayKey: z.string().min(1),
  whyKey: z.string().min(1),
  /** 클라이언트에겐 A/B 비교만 간다 */
  clientView: z.literal('compare-only'),
})
export type ProOpinion = z.infer<typeof ProOpinionSchema>

export const MarketplaceMapSchema = z.object({
  categoryHints: z.array(z.string().min(1)),
  offerTemplate: z.string().min(1),
  listingTemplate: z.string().min(1),
})

/**
 * 원본이 적을 수 있는 정책은 오버라이드뿐이다. 전부 optional.
 *
 * 파생 가능한 값(리허설 유무 · PNR 차단 여부 · 수정 모드)을 여기 적을 수 없게
 * 막는 것이 07 합격 기준 4의 전부다. 적을 수 있으면 reversibility 를 바꿔도
 * 아무 일이 안 일어난다.
 */
export const PolicyOverrideSchema = z
  .object({
    revisionCount: z.number().int().nonnegative().optional(),
    pointOfNoReturnKey: LabelKeyRefSchema.optional(),
    pnrStageIndex: z.number().int().nonnegative().optional(),
    responseSlaDays: z.number().int().positive().optional(),
  })
  .strict()
export type PolicyOverride = z.infer<typeof PolicyOverrideSchema>

export const ProfileSourceSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9][a-z0-9-]*$/u, 'SLUG_FORMAT'),
    nameKey: LabelKeyRefSchema,
    version: z.number().int().positive(),
    visibility: z.enum(['system', 'private', 'public']),
    authorId: z.string().uuid().optional(),

    reversibility: ReversibilitySchema,

    marketplace: MarketplaceMapSchema,
    policy: PolicyOverrideSchema.default({}),
    flow: z.array(z.object({ key: z.string().min(1) })).min(1),
    blocks: z.array(BlockSchema).min(1),
    opinions: z.array(ProOpinionSchema).default([]),
  })
  .strict()

export type ProfileSource = z.infer<typeof ProfileSourceSchema>
