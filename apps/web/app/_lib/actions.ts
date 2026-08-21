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
  composedWith,
  evaluateAssets,
  progressOf,
  renderOfferText,
  renderSheet,
  shouldSettle,
  type AssetStates,
  type Basis,
  type NegotiationProposal,
  type NegotiationView,
  type RevisionRequest,
  type SerializedPair,
  type Side,
  type Spec,
  type Verdict,
} from '@preflight/core'
import type { RenderNode } from '@preflight/render'
import { renderCard } from '@preflight/render'
import { runtime } from './runtime.ts'

export interface FlowState {
  readonly no: string
  readonly cursor: string | null
  readonly blockType: string | null
  /** CHECKLIST 를 범위(C-07)와 자료(C-08)로 가른다 */
  readonly blockMode: 'scope' | 'assets' | null
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
  /**
   * 지금까지 고른 쪽. 이게 있어야 클라이언트가 C-03 미리보기를 **서버 왕복 없이**
   * 그릴 수 있고, 새로고침 후에도 같은 화면이 나온다.
   */
  readonly pairChoices: readonly Side[]
  /** 카드가 끝나 확인 화면으로 넘어갈 준비가 됐는가 */
  readonly awaitingConfirm: boolean

  readonly opened: boolean
  readonly settled: boolean
  readonly reviewGate: boolean
  readonly pendingNegotiations: number

  /**
   * 체크 상태를 서버에서 내려준다. 클라이언트 로컬 state 로 들고 있으면
   * 새로고침 후 체크박스와 금액이 어긋난다.
   */
  readonly scope: Readonly<Record<string, boolean>>
  readonly assets: AssetStates
  readonly assetsProvided: number
  readonly assetsTotal: number
  readonly delayedDays: number
  readonly startBlocked: boolean
}

async function stateOf(token: string): Promise<FlowState> {
  const svc = (await runtime()).service
  const record = await svc.record(token)
  const view = await svc.view(token)
  const cursor = view.cursor
  const block = record.profile.blocks.find((b) => b.id === cursor)
  const config = block?.config

  let pair: SerializedPair | null = null
  let pairCursor = 0
  let pairTotal = 0
  let awaitingConfirm = false
  let pairChoices: readonly Side[] = []

  if (cursor !== null && config?.kind === 'PAIRWISE') {
    pairChoices = record.choices[cursor] ?? []
    pairCursor = (record.choices[cursor] ?? []).length
    pairTotal = progressOf(config, pairCursor).total
    pair = await svc.pair(token, cursor)
    awaitingConfirm = pair === null
  }

  return {
    no: view.no,
    cursor,
    blockType: block?.type ?? null,
    blockMode: config?.kind === 'CHECKLIST' ? config.mode : null,
    locked: view.locked,
    total: view.total,
    amountUsd: view.amountUsd,
    weeks: view.weeks,
    revisions: view.revisions,
    canSettle: view.canSettle,
    pair,
    pairCursor,
    pairTotal,
    pairChoices,
    awaitingConfirm,
    opened: view.opened,
    settled: view.settled,
    reviewGate: view.reviewGate,
    pendingNegotiations: view.pendingNegotiations,
    scope: record.scope,
    assets: record.assets,
    assetsProvided: view.assetsProvided,
    assetsTotal: view.assetsTotal,
    delayedDays: view.delayedDays,
    startBlocked: view.startBlocked,
  }
}

/**
 * 확정 판단을 **서버 한 곳**에 둔다.
 *
 * 전에는 Flow 가 `canSettle` 만 보고 곧장 확정해서, 남아 있는 선택 블록
 * (자료 체크)을 통째로 건너뛰었다. 커서가 비었는지를 먼저 봐야 한다.
 */
async function maybeSettle(token: string): Promise<void> {
  const svc = (await runtime()).service
  const v = await svc.view(token)
  if (shouldSettle(v)) await svc.settle(token)
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
  await maybeSettle(token)
  return stateOf(token)
}

export async function setScope(token: string, items: Record<string, boolean>): Promise<FlowState> {
  await (await runtime()).service.setScope(token, items)
  return stateOf(token)
}

/**
 * C-08 — 자료 한 건의 상태를 바꾼다.
 *
 * `provided` 는 **업로드가 아니라 "보냈음" 체크**다. 파일은 마켓플레이스로
 * 가야 하며 여기서 받지 않는다 (09 §2.2).
 */
export async function setAsset(
  token: string,
  labelKey: string,
  patch: { readonly provided?: boolean; readonly fallbackTaken?: boolean },
): Promise<FlowState> {
  const svc = (await runtime()).service
  const record = await svc.record(token)
  const prev = record.assets[labelKey] ?? {}
  await svc.setAssets(token, { [labelKey]: { ...prev, ...patch } })
  return stateOf(token)
}

/** 확정된 세션의 사양서. 확정 전이면 null */
export async function spec(token: string): Promise<Spec | null> {
  const built = await (await runtime()).service.specOf(token)
  return built === null ? null : built.spec
}

// ── C-04 역제안 ─────────────────────────────────────────────────────────

export interface NegotiationCard {
  readonly item: NegotiationView
  readonly currentPreview: RenderNode
  readonly proposedPreview: RenderNode
}

/**
 * 05 §8 — 비교 렌더링 값만. 근거는 타입 수준에서 떨어져 있다 (`toClientView`).
 *
 * **양쪽 카드를 모두 `composedWith` 로 만든다.** 현재값 쪽을 `composedValues`
 * 로 만들면 image 렌더러 프로파일(seo · print)에서 무관한 두 장이 나란히 뜬다 —
 * 그 프로파일들은 전 축이 같은 `src` 필드를 쓰기 때문이다.
 */
export async function negotiationDeck(token: string): Promise<NegotiationCard[]> {
  const rt = await runtime()
  const record = await rt.service.record(token)
  const items = await rt.service.negotiations(token)

  const pairwise = record.profile.blocks.find((b) => b.config.kind === 'PAIRWISE')
  if (pairwise === undefined) return []
  const config = pairwise.config
  if (config.kind !== 'PAIRWISE') return []
  const choices = (record.choices[pairwise.id] ?? []) as Side[]
  const box = { w: 150, h: 170 }

  return items
    .filter((n) => n.response === null)
    .map((item) => ({
      item,
      currentPreview: renderCard(
        config.renderer,
        composedWith(config, choices, { axisKey: item.axisKey, value: item.current.value }),
        box,
      ),
      proposedPreview: renderCard(
        config.renderer,
        composedWith(config, choices, { axisKey: item.axisKey, value: item.proposed.value }),
        box,
      ),
    }))
}

export async function respondNegotiation(
  token: string,
  id: string,
  response: 'accept' | 'keep',
): Promise<FlowState> {
  await (await runtime()).service.respondNegotiation(token, id, response)
  await maybeSettle(token)
  return stateOf(token)
}

// ── C-11 피드백 ─────────────────────────────────────────────────────────

export interface FeedbackInput {
  readonly basis: Basis
  readonly axisKey: string
  /** 0~100. 50 이 중립이고 양끝이 강한 변경이다 */
  readonly direction: number
  readonly note: string
}

/** C-11 Q2 는 **확정된 축에서만** 고르게 한다 (FR-9.6) */
export async function feedbackAxes(token: string): Promise<string[]> {
  const built = await (await runtime()).service.specOf(token)
  return built === null ? [] : built.spec.lines.map((l) => l.key)
}

/**
 * 04 §4 — 판정 신호 파생.
 *
 * `RequestSignals` 는 7개 필드인데 C-11 이 묻는 건 4개뿐이다. 나머지는 파생한다 —
 * 클라이언트에게 "변경 비율이 몇 %입니까" 를 물을 수는 없다.
 *
 * 슬라이더를 끝까지 밀면 changeRatio 가 재분류 기준(0.3)을 넘어 "취향 변경" 이
 * "방향 변경" 으로 올라간다. 스스로 말한 강도가 그대로 판정 근거가 된다.
 */
export async function submitFeedback(token: string, input: FeedbackInput): Promise<Verdict> {
  const svc = (await runtime()).service
  const axes = await feedbackAxes(token)
  return svc.submitRequest(
    token,
    {
      basis: input.basis,
      changeRatio: Math.abs(input.direction - 50) / 50,
      axesTouched: 1,
      outOfScope: input.axisKey !== '' && !axes.includes(input.axisKey),
    },
    { axisKey: input.axisKey, direction: input.direction, note: input.note },
  )
}

// ── 결과 전달 ───────────────────────────────────────────────────────────

/**
 * 프리랜서 화면용 액션은 던지지 않고 **결과를 돌려준다.**
 *
 * 두 가지 이유가 있다. 하나, Next 는 운영에서 서버 액션 예외 메시지를 통째로
 * 가린다 — 화면이 "알 수 없는 오류" 밖에 말할 수 없게 된다. 둘, InvariantError
 * 의 code 는 내부 코드이며 사용자에게 노출하지 않기로 돼 있다(invariant.ts).
 *
 * 그래서 code 를 여기서 한 번 걸러 화면이 아는 코드로만 내보내고, 화면이 그것을
 * 로케일 문구와 행동 버튼으로 바꾼다.
 */
export type ActionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: string }

/** 화면이 문구를 갖고 있는 코드만 통과시킨다. 나머지는 뭉뚱그린다 */
const SHOWN = new Set([
  'BILLING_REQUIRED',
  'PRO_SUSPENDED',
  'UNAUTHORIZED',
  'PROFILE_NOT_FOUND',
  'EMAIL_TAKEN',
  'EMAIL_INVALID',
  'NAME_REQUIRED',
  'LOCALE_UNSUPPORTED',
  'TIMEZONE_INVALID',
  'BILLING_KEY_REQUIRED',
  'PG_PROVIDER_REQUIRED',
  'LOOKS_LIKE_CARD_NUMBER',
  'TOO_MANY_PROPOSALS',
  'DUPLICATE_AXIS_PROPOSAL',
  'REVIEW_GATE_OFF',
  'ALREADY_SETTLED',
  'NEGOTIATION_PENDING',
  'GATE_LOCKED',
])

async function attempt<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, value: await run() }
  } catch (e: unknown) {
    const raw = e instanceof Error ? e.message.split(':')[0]!.trim() : ''
    return { ok: false, code: SHOWN.has(raw) ? raw : 'UNKNOWN' }
  }
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
  readonly reviewGate: boolean
  /** 04 §5.2 — 클라이언트가 끝냈고 검토를 기다린다 */
  readonly awaitingReview: boolean
  readonly pendingNegotiations: number
  readonly requestCount: number
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
        reviewGate: v.reviewGate,
        awaitingReview: v.reviewGate && !v.settled && v.cursor === null,
        pendingNegotiations: v.pendingNegotiations,
        requestCount: r.requests.length,
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

export interface IssuedLink {
  readonly no: string
  readonly clientUrl: string
  readonly shareText: string
  readonly token: string
}

export async function issueLink(
  slug: string,
  clientLabel: string,
  reviewGate = false,
  shareLocale = 'en',
): Promise<ActionResult<IssuedLink>> {
  return attempt(async () => {
    const rt = await runtime()
    const profile = rt.profiles.find((p) => p.slug === slug)
    if (!profile) throw new Error('PROFILE_NOT_FOUND')
    const r = await rt.service.issue({
      proId: rt.proId,
      profile,
      clientLabel,
      reviewGate,
      shareLocale,
    })
    return { no: r.no, clientUrl: r.clientUrl, shareText: r.shareText, token: r.token }
  })
}

/** 콘솔이 어떤 언어로 그려질지. 지금은 데모 계정 하나이므로 그 계정의 로케일이다 */
export async function proLocale(): Promise<string> {
  const rt = await runtime()
  const pro = await rt.proService.byId(rt.proId)
  return pro?.locale ?? 'en'
}

// ── P-05 검토 ───────────────────────────────────────────────────────────

export interface ReviewAxis {
  readonly axisKey: string
  readonly blockId: string
  /** 클라이언트가 고른 쪽 */
  readonly current: { readonly labelKey: string; readonly measure: string }
  /** 고르지 않은 쪽. 제안이란 곧 이것이다 */
  readonly proposed: { readonly labelKey: string; readonly measure: string }
}

export interface ReviewDeck {
  readonly no: string
  readonly reviewGate: boolean
  readonly awaitingReview: boolean
  readonly settled: boolean
  readonly maxProposals: number
  readonly axes: readonly ReviewAxis[]
  readonly sent: readonly NegotiationView[]
  readonly requests: readonly RevisionRequest[]
}

/**
 * P-05 — 축마다 카드가 정확히 둘이므로 "제안" 은 **클라이언트가 고르지 않은 쪽**
 * 하나뿐이다. 자유 입력이 필요 없고, 그래서 임의 조합이 만들어질 경로도 없다.
 */
export async function reviewDeck(token: string): Promise<ReviewDeck> {
  const rt = await runtime()
  const r = await rt.service.record(token)
  const v = await rt.service.view(token)

  const axes: ReviewAxis[] = []
  for (const block of r.profile.blocks) {
    const config = block.config
    if (config.kind !== 'PAIRWISE') continue
    const choices = (r.choices[block.id] ?? []) as Side[]
    config.axes.forEach((axis, i) => {
      const chosen = choices[i]
      if (chosen === undefined) return
      const other: Side = chosen === 'a' ? 'b' : 'a'
      axes.push({
        axisKey: axis.nameKey,
        blockId: block.id,
        current: { labelKey: axis[chosen].labelKey, measure: axis[chosen].measure },
        proposed: { labelKey: axis[other].labelKey, measure: axis[other].measure },
      })
    })
  }

  return {
    no: r.no,
    reviewGate: v.reviewGate,
    awaitingReview: v.reviewGate && !v.settled && v.cursor === null,
    settled: v.settled,
    maxProposals: 3,
    axes,
    sent: await rt.service.negotiations(token),
    requests: r.requests,
  }
}

/** 04 §5 — 근거는 저장되지만 클라이언트에게 내려가지 않는다 */
export async function propose(
  token: string,
  picks: readonly { readonly axisKey: string; readonly reasonFree?: string }[],
): Promise<number> {
  const rt = await runtime()
  const r = await rt.service.record(token)
  const deck = await reviewDeck(token)
  const byKey = new Map(deck.axes.map((a) => [a.axisKey, a]))

  const proposals: NegotiationProposal[] = []
  for (const [i, p] of picks.entries()) {
    const axis = byKey.get(p.axisKey)
    if (axis === undefined) continue
    const block = r.profile.blocks.find((b) => b.id === axis.blockId)!
    const config = block.config
    if (config.kind !== 'PAIRWISE') continue
    const source = config.axes.find((a) => a.nameKey === p.axisKey)!
    const choices = (r.choices[axis.blockId] ?? []) as Side[]
    const idx = config.axes.findIndex((a) => a.nameKey === p.axisKey)
    const chosen = choices[idx]!
    const other: Side = chosen === 'a' ? 'b' : 'a'

    proposals.push({
      id: `${r.id}:n${i}`,
      axisKey: p.axisKey,
      current: {
        labelKey: source[chosen].labelKey,
        measure: source[chosen].measure,
        value: source[chosen].value,
      },
      proposed: {
        labelKey: source[other].labelKey,
        measure: source[other].measure,
        value: source[other].value,
      },
      reasonFree: p.reasonFree,
      response: null,
    })
  }

  return rt.service.propose(token, proposals)
}

/** 화면이 쓰는 형태. 던지지 않는다 */
export async function sendProposals(
  token: string,
  picks: readonly { readonly axisKey: string; readonly reasonFree?: string }[],
): Promise<ActionResult<number>> {
  return attempt(() => propose(token, picks))
}

/** 역제안 없이 검토 종료. 있으면 클라이언트 응답을 기다린다 */
export async function passReview(token: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    await (await runtime()).service.passReview(token)
    return null
  })
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
}): Promise<ActionResult<ProView>> {
  return attempt(async () => view(await (await runtime()).proService.signup(input)))
}

/** NFR-5.4 — 카드 번호가 아니라 PG 빌링키만 받는다. */
export async function registerBilling(
  proId: string,
  provider: string,
  billingKey: string,
): Promise<ActionResult<ProView>> {
  return attempt(async () =>
    view(await (await runtime()).proService.registerBilling(proId, { provider, billingKey })),
  )
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

/** 자료 블록 계산 결과. C-08 이 쓰는 파생값 */
export async function assetTotals(
  token: string,
): Promise<{ provided: number; total: number; extraUsd: number }> {
  const rt = await runtime()
  const r = await rt.service.record(token)
  const block = r.profile.blocks.find(
    (b) => b.config.kind === 'CHECKLIST' && b.config.mode === 'assets',
  )
  if (block === undefined) return { provided: 0, total: 0, extraUsd: 0 }
  const out = evaluateAssets(block.config, r.assets)
  return { provided: out.provided, total: out.total, extraUsd: out.extraUsd }
}
