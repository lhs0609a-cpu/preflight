'use server'

/**
 * 세션 조작. SessionService 를 얇게 감싸기만 한다.
 *
 * 05 문서의 REST 표면은 마켓플레이스 연동·웹훅용이며 M2 에서 붙인다.
 * 어느 쪽이든 진입점은 SessionService 하나이므로 두 구현이 갈라지지 않는다.
 *
 * 여기에 "전송" 계열 동작은 없고 앞으로도 만들지 않는다 (G-3 · 09 §2.2).
 */
import {
  composedValues,
  linesFromChoices,
  progressOf,
  renderOfferText,
  renderSheet,
  type BlockConfig,
  type SerializedPair,
  type Side,
  type Spec,
  type SpecLine,
} from '@preflight/core'
import type { RenderNode } from '@preflight/render'
import { renderCard } from '@preflight/render'
import { runtime } from './runtime.ts'

export interface FlowState {
  readonly no: string
  readonly cursor: string | null
  readonly blockType: string | null
  readonly locked: number
  readonly total: number
  readonly amountUsd: number
  readonly weeks: number
  readonly revisions: number
  readonly canSettle: boolean
  /** 현재 블록이 PAIRWISE 일 때만 */
  readonly pair: SerializedPair | null
  readonly pairCursor: number
  readonly pairTotal: number
  /** 카드가 끝나 확인 화면으로 넘어갈 준비가 됐는가 */
  readonly awaitingConfirm: boolean
}

async function configOf(token: string, blockId: string): Promise<BlockConfig> {
  const rt = await runtime()
  const record = await rt.service.record(token)
  return record.profile.blocks.find((b) => b.id === blockId)!.config
}

async function stateOf(token: string): Promise<FlowState> {
  const svc = (await runtime()).service
  const view = await svc.view(token)
  const cursor = view.cursor
  const block = view.blocks.find((b) => b.blockId === cursor)

  let pair: SerializedPair | null = null
  let pairCursor = 0
  let pairTotal = 0
  let awaitingConfirm = false

  if (cursor !== null && block?.type === 'PAIRWISE') {
    const config = await configOf(token, cursor)
    const record = await svc.record(token)
    pairCursor = (record.choices[cursor] ?? []).length
    pairTotal = progressOf(config, pairCursor).total
    pair = await svc.pair(token, cursor)
    awaitingConfirm = pair === null
  }

  return {
    no: view.no,
    cursor,
    blockType: block?.type ?? null,
    locked: view.locked,
    total: view.total,
    amountUsd: view.amountUsd,
    weeks: view.weeks,
    revisions: view.revisions,
    canSettle: view.canSettle,
    pair,
    pairCursor,
    pairTotal,
    awaitingConfirm,
  }
}

export async function openSession(token: string): Promise<FlowState> {
  await (await runtime()).service.open(token)
  return stateOf(token)
}

export async function readState(token: string): Promise<FlowState> {
  return stateOf(token)
}

export async function answer(token: string, blockId: string, side: Side): Promise<FlowState> {
  await (await runtime()).service.answer(token, blockId, side)
  return stateOf(token)
}

export async function undo(token: string, blockId: string): Promise<FlowState> {
  await (await runtime()).service.undo(token, blockId)
  return stateOf(token)
}

export async function pick(token: string, blockId: string, index: number): Promise<FlowState> {
  await (await runtime()).service.pick(token, blockId, index)
  return stateOf(token)
}

export async function settleBlock(token: string, blockId: string): Promise<FlowState> {
  await (await runtime()).service.settleBlock(token, blockId)
  return stateOf(token)
}

export async function setScope(
  token: string,
  items: Record<string, boolean>,
): Promise<FlowState> {
  await (await runtime()).service.setScope(token, items)
  return stateOf(token)
}

export interface ConfirmView {
  readonly lines: readonly SpecLine[]
  readonly preview: RenderNode
}

/** C-03 — 전 축을 반영한 합성 미리보기와 수치 목록 */
export async function confirmView(token: string, blockId: string): Promise<ConfirmView> {
  const rt = await runtime()
  const record = await rt.service.record(token)
  const config = await configOf(token, blockId)
  if (config.kind !== 'PAIRWISE') throw new Error('BLOCK_NOT_PAIRWISE')
  const choices = (record.choices[blockId] ?? []) as Side[]
  return {
    lines: linesFromChoices(config, choices),
    preview: renderCard(config.renderer, composedValues(config, choices), { w: 260, h: 190 }),
  }
}

export async function settle(token: string): Promise<Spec> {
  return (await (await runtime()).service.settle(token)).spec
}

export interface IssuedLink {
  readonly no: string
  readonly clientUrl: string
  readonly shareText: string
  readonly token: string
}

export async function issueLink(slug: string, clientLabel: string): Promise<IssuedLink> {
  const rt = await runtime()
  const profile = rt.profiles.find((p) => p.slug === slug)
  if (!profile) throw new Error('PROFILE_NOT_FOUND')
  const r = await rt.service.issue({ proId: rt.proId, profile, clientLabel })
  return { no: r.no, clientUrl: r.clientUrl, shareText: r.shareText, token: r.token }
}

// ── 프리랜서 콘솔 (P-02 · P-03 · P-05) ──────────────────────────────────

export interface SessionRow {
  readonly id: string
  readonly no: string
  readonly token: string
  readonly profileSlug: string
  readonly clientLabel: string | null
  readonly state: string
  readonly locked: number
  readonly total: number
  readonly amountUsd: number
  readonly weeks: number
}

export async function listSessions(): Promise<SessionRow[]> {
  const rt = await runtime()
  const records = await rt.service.store.listByPro(rt.proId)
  return Promise.all(
    records.map(async (r) => {
      const v = await rt.service.view(r.token)
      return {
        id: r.id,
        no: r.no,
        token: r.token,
        profileSlug: r.profile.slug,
        clientLabel: r.clientLabel,
        state: r.state,
        locked: v.locked,
        total: v.total,
        amountUsd: v.amountUsd,
        weeks: v.weeks,
      }
    }),
  )
}

export interface Deliverables {
  /** 언어 중립 사양서. 양측이 같은 문서를 본다 */
  readonly sheet: string
  /** 프리랜서 로케일 병기본 (FR-8.6) */
  readonly sheetLocalized: string
  /** 마켓플레이스 커스텀 오퍼용 영문. **복사만** 한다 (G-3) */
  readonly offer: string
}

export async function deliverables(token: string, locale = 'ko'): Promise<Deliverables | null> {
  const rt = await runtime()
  const built = await rt.service.specOf(token)
  if (built === null) return null

  const dict = rt.bundle[locale as keyof typeof rt.bundle] ?? rt.dict
  return {
    sheet: renderSheet(built.spec),
    sheetLocalized: renderSheet(built.spec, { dict }),
    offer: renderOfferText(built.spec),
  }
}

// ── 온보딩 (P-01) ───────────────────────────────────────────────────────

export interface ProView {
  readonly id: string
  readonly email: string
  readonly displayName: string
  readonly locale: string
  readonly timezone: string
  readonly billingVerified: boolean
}

export async function signup(input: {
  email: string
  displayName: string
  locale: string
  timezone: string
}): Promise<ProView> {
  const pro = await (await runtime()).proService.signup(input)
  return view(pro)
}

/** NFR-5.4 — 카드 번호가 아니라 PG 빌링키만 받는다. */
export async function registerBilling(
  proId: string,
  provider: string,
  billingKey: string,
): Promise<ProView> {
  const pro = await (await runtime()).proService.registerBilling(proId, { provider, billingKey })
  return view(pro)
}

function view(p: {
  id: string
  email: string
  displayName: string
  locale: string
  timezone: string
  billingVerified: boolean
}): ProView {
  return {
    id: p.id,
    email: p.email,
    displayName: p.displayName,
    locale: p.locale,
    timezone: p.timezone,
    billingVerified: p.billingVerified,
  }
}
