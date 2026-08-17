/**
 * 범위·자료 계산 — FR-5 · FR-6 · 04 §6 · 05 §7.
 *
 * 내부 계산은 USD 고정이며 정수 센트로 다룬다 (12 §8.2).
 * 0.1+0.2 문제가 사양서 해시에 섞이면 분쟁 증거로서의 자격을 잃는다.
 * 클라이언트 화면의 로케일 통화 표시는 환산일 뿐 계산이 아니다.
 */
import { invariant } from '../invariant.ts'
import type { BlockConfig } from '../block/types.ts'

const cents = (usd: number): number => Math.round(usd * 100)
const dollars = (c: number): number => Math.round(c) / 100

function checklistOf(
  config: BlockConfig,
  mode: 'scope' | 'assets',
): Extract<BlockConfig, { kind: 'CHECKLIST' }> {
  invariant(config.kind === 'CHECKLIST', 'BLOCK_NOT_CHECKLIST', config.kind)
  invariant(config.mode === mode, 'CHECKLIST_MODE_MISMATCH', `${config.mode} != ${mode}`)
  return config
}

/** 05 §7 — 인덱스 키. `{ "0": true, "1": false }` */
export type ChecklistSelection = Readonly<Record<string, boolean>>

export interface ScopeResult {
  readonly amountUsd: number
  readonly weeks: number
  readonly selected: number
  readonly total: number
}

/**
 * 06 C-07 검증: main(180,2w) + mobile(80,1w) + booking(120,1w), baseWeeks 2
 *   → $380 · 6w
 */
export function evaluateScope(config: BlockConfig, selection?: ChecklistSelection): ScopeResult {
  const c = checklistOf(config, 'scope')
  let amount = 0
  let weeks = c.baseWeeks
  let selected = 0

  c.items.forEach((item, i) => {
    const on = selection?.[String(i)] ?? item.default
    if (!on) return
    amount += cents(item.amountUsd)
    weeks += item.weeks
    selected++
  })

  return { amountUsd: dollars(amount), weeks, selected, total: c.items.length }
}

export interface AssetState {
  readonly provided?: boolean
  /** 대행을 선택했는가 (FR-6.2) */
  readonly fallbackTaken?: boolean
  /** 미제공 상태로 경과한 일수 */
  readonly daysWaiting?: number
}

export type AssetStates = Readonly<Record<string, AssetState>>

export interface AssetsResult {
  readonly extraUsd: number
  /** 04 §6 — blocks_start 항목이 전부 갖춰져야 납기가 기산된다 */
  readonly startBlocked: boolean
  readonly delayedDays: number
  readonly provided: number
  readonly total: number
}

/**
 * 05 §7 검증: 6개 중 5개 제공, photos 대행(+$60) → extraUsd 60
 * 표시는 재촉이 아니라 계산 결과다 (04 §6).
 */
export function evaluateAssets(config: BlockConfig, states?: AssetStates): AssetsResult {
  const c = checklistOf(config, 'assets')
  let extra = 0
  let provided = 0
  let startBlocked = false
  let delayedDays = 0

  for (const item of c.items) {
    const s = states?.[item.labelKey] ?? {}
    const isProvided = s.provided === true
    const tookFallback = s.fallbackTaken === true

    if (isProvided) provided++
    if (tookFallback) {
      extra += cents(item.fallbackAmountUsd ?? 0)
      provided++
    }
    if (!isProvided && !tookFallback && item.blocksStart === true) {
      startBlocked = true
      delayedDays = Math.max(delayedDays, s.daysWaiting ?? 0)
    }
  }

  return {
    extraUsd: dollars(extra),
    startBlocked,
    delayedDays,
    provided: Math.min(provided, c.items.length),
    total: c.items.length,
  }
}

export interface TotalsInput {
  readonly scope?: ChecklistSelection
  readonly assets?: AssetStates
}

export interface SessionTotals {
  readonly amountUsd: number
  readonly weeks: number
  readonly revisions: number
  readonly startBlocked: boolean
  readonly delayedDays: number
  readonly rehearsalUsd: number
}

/**
 * 프로파일 전체 합계.
 * 리허설 금액은 gated 에서 컴파일이 주입한 블록에서 온다 — 원본에 적혀 있지 않다.
 */
export function totalsOf(
  profile: { readonly blocks: readonly { readonly config: BlockConfig }[]; readonly policy: { readonly revisionCount: number } },
  input: TotalsInput = {},
): SessionTotals {
  let amount = 0
  let weeks = 0
  let rehearsal = 0
  let startBlocked = false
  let delayedDays = 0

  for (const block of profile.blocks) {
    const config = block.config
    if (config.kind === 'CHECKLIST' && config.mode === 'scope') {
      const r = evaluateScope(config, input.scope)
      amount += cents(r.amountUsd)
      weeks += r.weeks
    } else if (config.kind === 'CHECKLIST' && config.mode === 'assets') {
      const r = evaluateAssets(config, input.assets)
      amount += cents(r.extraUsd)
      startBlocked ||= r.startBlocked
      delayedDays = Math.max(delayedDays, r.delayedDays)
    } else if (config.kind === 'REHEARSAL') {
      rehearsal += cents(config.amountUsd)
      amount += cents(config.amountUsd)
    }
  }

  return {
    amountUsd: dollars(amount),
    weeks,
    revisions: profile.policy.revisionCount,
    startBlocked,
    delayedDays,
    rehearsalUsd: dollars(rehearsal),
  }
}
