/**
 * 세션 서비스 — 05 문서 엔드포인트의 대응물.
 *
 * 전부 비동기다. 저장소가 Postgres 일 수 있기 때문이며, 그 사실을 인터페이스가
 * 숨기면 나중에 전부 다시 쓰게 된다.
 *
 * 규칙: 레코드를 고쳤으면 반드시 store.put() 으로 저장한다. 인메모리에서는
 * 객체를 직접 만져도 남지만 DB 에서는 사라진다 — 그 차이가 조용히 갈라지지
 * 않도록 모든 변경 뒤에 put 을 둔다.
 */
import {
  clientBlockViews,
  compileSpec,
  evaluateAssets,
  evaluateGate,
  formatSessionNo,
  invariant,
  judge,
  linesFromChoices,
  progressOf,
  serializedPairAt,
  specPayload,
  totalsOf,
  transition,
  pendingCount,
  respond as respondToProposal,
  shareTextFor,
  assertProposals,
  toClientView,
  type AssetState,
  type AssetStates,
  type BlockConfig,
  type BlockOutput,
  type ChecklistSelection,
  type ClientBlockView,
  type CompiledProfile,
  type NegotiationProposal,
  type NegotiationResponse,
  type NegotiationView,
  type RequestSignals,
  type SpecLine,
  type Verdict,
  type SerializedPair,
  type Side,
  type Spec,
} from '@preflight/core'
import {
  InMemoryProStore,
  InMemorySessionStore,
  type ProStore,
  type SessionRecord,
  type SessionStore,
} from './store.ts'

export interface Clock {
  now(): string
}

export interface Ids {
  /** NFR-5.1 — 128bit 이상 */
  token(): string
  id(): string
}

export interface IssueInput {
  readonly proId: string
  readonly profile: CompiledProfile
  readonly clientLabel?: string
  readonly marketplace?: string
  /** 04 §5.2 검토 관문. 기본 꺼짐 — store.ts 의 reviewGate 주석 참고 */
  readonly reviewGate?: boolean
  /**
   * FR-3.3 — 붙여넣을 안내문의 언어. **고객의 언어**다.
   *
   * 프리랜서 로케일이 아니다. 이 한 줄만 고객이 읽고, 링크를 연 뒤는 무언어라
   * 언어가 필요 없다. 기본은 영어 — 마켓플레이스의 공용어이기 때문이다.
   */
  readonly shareLocale?: string
}

export interface IssueResult {
  readonly id: string
  readonly no: string
  readonly token: string
  readonly clientUrl: string
  /** FR-3.3 — 프리랜서가 마켓플레이스 메시지에 **붙여넣을** 영문 안내문 */
  readonly shareText: string
  readonly state: 'ISSUED'
}

/** 05 §5 GET /s/{token} — 문장이 없다. 아이콘 키와 수치만. */
export interface ClientView {
  readonly no: string
  readonly profileIcon: string
  readonly blocks: readonly ClientBlockView[]
  readonly cursor: string | null
  readonly locked: number
  readonly total: number
  readonly amountUsd: number
  readonly weeks: number
  readonly revisions: number
  readonly startBlocked: boolean
  readonly delayedDays: number
  readonly canSettle: boolean
  /** 미응답 역제안 수. 0 이 아니면 확정이 막힌다 */
  readonly pendingNegotiations: number
  /** 04 §5.2 검토 관문이 켜진 세션인가 */
  readonly reviewGate: boolean
  /** 관문이 켜져 있고 아직 프리랜서가 보지 않았다 */
  readonly reviewPending: boolean
  readonly settled: boolean
  readonly opened: boolean
  /** 자료 블록 진행. 없으면 0 / 0 */
  readonly assetsProvided: number
  readonly assetsTotal: number
}

export interface AnswerResult {
  readonly cursor: number
  readonly total: number
  readonly done: boolean
  readonly nextPair: SerializedPair | null
}

export interface ServiceOptions {
  readonly store?: SessionStore
  readonly pros?: ProStore
  readonly clock?: Clock
  readonly ids?: Ids
  readonly baseUrl?: string
}

const defaultClock: Clock = { now: () => new Date().toISOString() }

function randomHex(bytes: number): string {
  const b = new Uint8Array(bytes)
  globalThis.crypto.getRandomValues(b)
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

const defaultIds: Ids = {
  token: () => randomHex(24), // 192bit — NFR-5.1 하한 초과
  id: () => randomHex(16),
}

export class SessionService {
  readonly #store: SessionStore
  readonly #pros: ProStore
  readonly #clock: Clock
  readonly #ids: Ids
  readonly #baseUrl: string

  constructor(opts: ServiceOptions = {}) {
    this.#store = opts.store ?? new InMemorySessionStore()
    this.#pros = opts.pros ?? new InMemoryProStore()
    this.#clock = opts.clock ?? defaultClock
    this.#ids = opts.ids ?? defaultIds
    this.#baseUrl = opts.baseUrl ?? 'https://pf.work'
  }

  get store(): SessionStore {
    return this.#store
  }

  get pros(): ProStore {
    return this.#pros
  }

  // ── 발급 (05 §5) ─────────────────────────────────────────────────────

  /**
   * FR-1.4 · 03 §2.2 — 빌링키 미등록이면 링크를 발급하지 않는다.
   *
   * 이것이 회수율의 1차 방어선이다. 후청구 모델에서 결제수단 없이 링크를
   * 뿌리게 두면 수수료를 받을 방법이 없다 (10 문서).
   */
  async issue(input: IssueInput): Promise<IssueResult> {
    const pro = await this.#pros.byId(input.proId)
    invariant(pro !== undefined, 'UNAUTHORIZED', input.proId)
    invariant(pro.state !== 'SUSPENDED', 'PRO_SUSPENDED', input.proId)
    invariant(pro.billingVerified, 'BILLING_REQUIRED', input.proId)

    const now = this.#clock.now()
    const d = new Date(now)
    // 번호는 저장소가 준다. 메모리 카운터면 인스턴스가 여럿일 때 겹친다.
    const period = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const no = formatSessionNo(
      d.getUTCFullYear(),
      d.getUTCMonth() + 1,
      await this.#store.nextSeq(period),
    )
    const token = this.#ids.token()

    const record: SessionRecord = {
      id: this.#ids.id(),
      no,
      token,
      proId: input.proId,
      profile: input.profile,
      state: 'ISSUED',
      choices: {},
      picks: {},
      scope: {},
      assets: {},
      settled: [],
      submitted: [],
      negotiations: [],
      axisOverrides: {},
      revisionsUsed: 0,
      requests: [],
      members: [],
      pnrPassedAt: null,
      reviewGate: input.reviewGate ?? false,
      reviewedAt: null,
      createdAt: now,
      openedAt: null,
      settledAt: null,
      clientLabel: input.clientLabel ?? null,
      marketplace: input.marketplace ?? null,
    }
    await this.#store.put(record)

    const clientUrl = this.#baseUrl + '/s/' + token
    return {
      id: record.id,
      no,
      token,
      clientUrl,
      // 09 §2.1 — 생성만 한다. 전송은 사람이 한다.
      shareText: shareTextFor(input.shareLocale ?? 'en', clientUrl),
      state: 'ISSUED',
    }
  }

  // ── 조회 ─────────────────────────────────────────────────────────────

  async #require(token: string): Promise<SessionRecord> {
    const r = await this.#store.byToken(token)
    invariant(r !== undefined, 'UNAUTHORIZED', token.slice(0, 8))
    return r
  }

  async record(token: string): Promise<SessionRecord> {
    return this.#require(token)
  }

  /** 첫 열람이 상태를 옮긴다 (04 §1.1). */
  async open(token: string): Promise<ClientView> {
    const r = await this.#require(token)
    if (r.state === 'ISSUED') {
      r.state = transition(r.state, 'OPENED')
      r.openedAt = this.#clock.now()
      await this.#store.put(r)
    }
    return this.#viewOf(r)
  }

  async view(token: string): Promise<ClientView> {
    return this.#viewOf(await this.#require(token))
  }

  /**
   * 04 §6 — 미제공 자료가 며칠째 밀려 있는가.
   *
   * 저장하지 않고 **읽는 시점에 파생**한다. 저장하면 배치 작업이 필요하고,
   * 그 배치가 안 돌면 화면이 조용히 틀린 숫자를 보여준다.
   * 이미 제공됐거나 대행을 택한 항목은 대상이 아니다.
   */
  #assetsNow(r: SessionRecord): AssetStates {
    if (r.openedAt === null) return r.assets
    const days = Math.floor((Date.parse(this.#clock.now()) - Date.parse(r.openedAt)) / 86_400_000)
    if (!Number.isFinite(days) || days <= 0) return r.assets

    const out: Record<string, AssetState> = { ...r.assets }
    for (const block of r.profile.blocks) {
      const config = block.config
      if (config.kind !== 'CHECKLIST' || config.mode !== 'assets') continue
      for (const item of config.items) {
        const s = out[item.labelKey] ?? {}
        if (s.provided === true || s.fallbackTaken === true) continue
        out[item.labelKey] = { ...s, daysWaiting: days }
      }
    }
    return out
  }

  #viewOf(r: SessionRecord): ClientView {
    const pending = pendingCount(r.negotiations)
    const gate = evaluateGate(r.profile, {
      settled: new Set(r.settled),
      submitted: new Set(r.submitted),
      pendingNegotiations: pending,
    })
    const assets = this.#assetsNow(r)
    const totals = totalsOf(r.profile, { scope: r.scope, assets })
    const assetBlock = r.profile.blocks.find(
      (b) => b.config.kind === 'CHECKLIST' && b.config.mode === 'assets',
    )
    const assetCounts =
      assetBlock === undefined
        ? { provided: 0, total: 0 }
        : evaluateAssets(assetBlock.config, assets)

    return {
      pendingNegotiations: pending,
      reviewGate: r.reviewGate,
      reviewPending: r.reviewGate && r.reviewedAt === null,
      settled: r.settledAt !== null,
      opened: r.openedAt !== null,
      assetsProvided: assetCounts.provided,
      assetsTotal: assetCounts.total,
      no: r.no,
      profileIcon: r.profile.blocks[0]?.icon ?? 'grid',
      blocks: clientBlockViews(r.profile, gate),
      cursor: gate.cursor,
      locked: lockedLineCount(r),
      total: totalLineCount(r),
      amountUsd: totals.amountUsd,
      weeks: totals.weeks,
      revisions: totals.revisions,
      startBlocked: totals.startBlocked,
      delayedDays: totals.delayedDays,
      canSettle: gate.canSettle,
    }
  }

  // ── 블록 실행 (05 §6) ────────────────────────────────────────────────

  #assertOpen(r: SessionRecord, blockId: string): void {
    const gate = evaluateGate(r.profile, {
      settled: new Set(r.settled),
      submitted: new Set(r.submitted),
    })
    const state = gate.states.get(blockId)
    invariant(state === 'OPEN', 'GATE_LOCKED', blockId + ':' + (state ?? 'UNKNOWN'))
  }

  #config(r: SessionRecord, blockId: string): BlockConfig {
    const block = r.profile.blocks.find((b) => b.id === blockId)
    invariant(block !== undefined, 'BLOCK_NOT_FOUND', blockId)
    return block.config
  }

  async pair(token: string, blockId: string): Promise<SerializedPair | null> {
    const r = await this.#require(token)
    return serializedPairAt(this.#config(r, blockId), (r.choices[blockId] ?? []).length)
  }

  async answer(token: string, blockId: string, side: Side): Promise<AnswerResult> {
    const r = await this.#require(token)
    this.#assertOpen(r, blockId)
    if (r.state === 'OPENED') r.state = transition(r.state, 'IN_PROGRESS')

    const config = this.#config(r, blockId)
    const choices = [...(r.choices[blockId] ?? []), side]
    const { total, done } = progressOf(config, choices.length)
    invariant(choices.length <= total, 'CURSOR_OUT_OF_RANGE', String(choices.length))
    r.choices[blockId] = choices
    await this.#store.put(r)

    return {
      cursor: choices.length,
      total,
      done,
      nextPair: done ? null : serializedPairAt(config, choices.length),
    }
  }

  /** 뒤로 가기. C-02 하단의 화살표 하나가 이것이다. */
  async undo(token: string, blockId: string): Promise<AnswerResult> {
    const r = await this.#require(token)
    const config = this.#config(r, blockId)
    const choices = [...(r.choices[blockId] ?? [])]
    choices.pop()
    r.choices[blockId] = choices
    await this.#store.put(r)
    const { total, done } = progressOf(config, choices.length)
    return {
      cursor: choices.length,
      total,
      done,
      nextPair: serializedPairAt(config, choices.length),
    }
  }

  async pick(token: string, blockId: string, index: number): Promise<void> {
    const r = await this.#require(token)
    this.#assertOpen(r, blockId)
    const config = this.#config(r, blockId)
    invariant(config.kind === 'PICK_N', 'BLOCK_NOT_PICK_N', config.kind)
    invariant(index >= 0 && index < config.options.length, 'PICK_OUT_OF_RANGE', String(index))
    r.picks[blockId] = index
    await this.#store.put(r)
  }

  async setScope(token: string, selection: ChecklistSelection): Promise<ClientView> {
    const r = await this.#require(token)
    r.scope = { ...r.scope, ...selection }
    await this.#store.put(r)
    return this.#viewOf(r)
  }

  async setAssets(token: string, states: AssetStates): Promise<ClientView> {
    const r = await this.#require(token)
    r.assets = { ...r.assets, ...states }
    await this.#store.put(r)
    return this.#viewOf(r)
  }

  async settleBlock(token: string, blockId: string): Promise<ClientView> {
    const r = await this.#require(token)
    this.#assertOpen(r, blockId)
    const config = this.#config(r, blockId)

    if (config.kind === 'PAIRWISE') {
      const done = progressOf(config, (r.choices[blockId] ?? []).length).done
      invariant(done, 'BLOCK_INCOMPLETE', blockId)
    }
    if (config.kind === 'PICK_N') {
      invariant(r.picks[blockId] !== undefined, 'BLOCK_INCOMPLETE', blockId)
    }

    if (!r.settled.includes(blockId)) r.settled.push(blockId)
    if (r.state === 'OPENED') r.state = transition(r.state, 'IN_PROGRESS')
    await this.#store.put(r)
    return this.#viewOf(r)
  }

  // ── 팀 대조 (C-09 · FR-7) ────────────────────────────────────────────

  /**
   * 팀원 자리를 하나 연다. 링크만 만들고 **보내지 않는다** (09 §2.1).
   *
   * 이름을 받지 않는다. 화면은 A · B · C 순서만 보여주며, 이름을 넣는 순간
   * 로케일이 필요해지고 "누가 틀렸나" 를 가리키는 화면이 된다 (06 §C-09).
   */
  async addMember(token: string): Promise<{ id: string; url: string }> {
    const r = await this.#require(token)
    const roster = r.profile.blocks.find((b) => b.config.kind === 'ROSTER')
    invariant(roster !== undefined, 'NO_ROSTER_BLOCK', r.no)
    const config = roster.config
    invariant(config.kind === 'ROSTER', 'NO_ROSTER_BLOCK', r.no)
    invariant(r.settledAt === null, 'ALREADY_SETTLED', r.no)
    // 주 클라이언트가 한 자리를 차지한다. 나머지가 초대 가능한 수다
    invariant(r.members.length < config.maxMembers - 1, 'ROSTER_FULL', String(r.members.length))

    const member = {
      id: this.#ids.id(),
      token: this.#ids.token(),
      seq: r.members.length + 2, // A 는 주 클라이언트
      choices: {},
    }
    r.members = [...r.members, member]
    await this.#store.put(r)
    return { id: member.id, url: `${this.#baseUrl}/s/${member.token}` }
  }

  /** 팀원 토큰이면 그 팀원을, 아니면 undefined */
  async memberByToken(
    token: string,
  ): Promise<{ record: SessionRecord; memberId: string } | undefined> {
    return this.#store.byMemberToken(token)
  }

  /**
   * 팀원의 카드 응답. 주 클라이언트와 **같은 축**을 같은 순서로 본다 —
   * 그래야 대조가 성립한다.
   */
  async memberAnswer(memberToken: string, blockId: string, side: Side): Promise<AnswerResult> {
    const found = await this.#store.byMemberToken(memberToken)
    invariant(found !== undefined, 'UNAUTHORIZED', memberToken.slice(0, 8))
    const { record: r, memberId } = found
    const config = this.#config(r, blockId)
    const member = r.members.find((m) => m.id === memberId)!

    const choices = [...(member.choices[blockId] ?? []), side]
    const { total, done } = progressOf(config, choices.length)
    invariant(choices.length <= total, 'CURSOR_OUT_OF_RANGE', String(choices.length))
    member.choices = { ...member.choices, [blockId]: choices }
    await this.#store.put(r)

    return {
      cursor: choices.length,
      total,
      done,
      nextPair: done ? null : serializedPairAt(config, choices.length),
    }
  }

  // ── 조율 (05 §8 · C-04) ──────────────────────────────────────────────

  /**
   * 프리랜서 역제안. 근거는 저장되지만 클라이언트에게 내려가지 않는다.
   * 카드가 끝난 뒤 SLA 1일 안에 올린다 (04 §5.2).
   */
  async propose(token: string, items: readonly NegotiationProposal[]): Promise<number> {
    const r = await this.#require(token)
    assertProposals(items)
    r.negotiations = items.map((n) => ({ ...n, response: null }))
    // 04 §5.2 2단계 종료. 이후에는 클라이언트 응답만 남는다
    r.reviewedAt ??= this.#clock.now()
    await this.#store.put(r)
    return pendingCount(r.negotiations)
  }

  /** 05 §8 — 비교 렌더링 값만. 근거 문장이 없다. */
  async negotiations(token: string): Promise<NegotiationView[]> {
    const r = await this.#require(token)
    return toClientView(r.negotiations)
  }

  async respondNegotiation(
    token: string,
    id: string,
    response: NegotiationResponse,
  ): Promise<{ specLine: SpecLine; remaining: number }> {
    const r = await this.#require(token)
    const out = respondToProposal(r.negotiations, id, response)
    r.axisOverrides[out.specLine.key] = out.specLine
    await this.#store.put(r)
    return out
  }

  // ── 피드백 (05 §10 · C-11) ───────────────────────────────────────────

  /**
   * 04 §4 — 판정은 아이콘 + 숫자로 내려간다. 문장이 없다.
   * 자유 입력은 noteRaw 한 곳뿐이며 프리랜서 로케일로 번역해 전달한다.
   */
  async submitRequest(
    token: string,
    signals: RequestSignals,
    opts: {
      readonly outOfScopeUsd?: number
      /** C-11 Q2 — 지적된 축. 기록에 남는다 */
      readonly axisKey?: string
      /** C-11 Q3 — 0~100. 50 이 중립 */
      readonly direction?: number
      /** C-11 Q4 — 제품 전체에서 유일한 자유 텍스트. 프리랜서만 본다 */
      readonly note?: string
    } = {},
  ): Promise<Verdict> {
    const r = await this.#require(token)
    const totals = totalsOf(r.profile, { scope: r.scope, assets: r.assets })
    const verdict = judge(
      { ...signals, pnrPassed: r.pnrPassedAt !== null },
      { used: r.revisionsUsed, total: totals.revisions },
      {
        // 재견적 기본값은 계약 금액에서 파생한다. 임의 상수를 두면
        // 큰 계약과 작은 계약에서 같은 금액이 나온다.
        requoteUsd: Math.round(totals.amountUsd * 0.25),
        requoteDays: 2,
        outOfScopeUsd: opts.outOfScopeUsd ?? Math.round(totals.amountUsd * 0.05),
      },
    )

    if (verdict.outcome.kind === 'counted') {
      r.revisionsUsed = verdict.outcome.revisionsAfter.used
    }
    // 판정만 하고 버리면 프리랜서가 무엇을 요청받았는지 볼 수 없다.
    r.requests = [
      ...r.requests,
      {
        id: this.#ids.id(),
        at: this.#clock.now(),
        basis: signals.basis,
        axisKey: opts.axisKey ?? '',
        direction: opts.direction ?? 50,
        note: opts.note ?? '',
        verdict,
      },
    ]
    await this.#store.put(r)
    return verdict
  }

  /**
   * 04 §5.2 3~4 — 프리랜서 검토 종료.
   *
   * 역제안이 없으면 그대로 확정한다. 있으면 확정하지 않는다 — 클라이언트가
   * 전부 응답해야 SETTLED 다.
   */
  async passReview(token: string): Promise<ClientView> {
    const r = await this.#require(token)
    invariant(r.reviewGate, 'REVIEW_GATE_OFF', r.no)
    invariant(r.settledAt === null, 'ALREADY_SETTLED', r.no)
    r.reviewedAt ??= this.#clock.now()
    await this.#store.put(r)
    if (pendingCount(r.negotiations) === 0) await this.settle(token)
    return this.view(token)
  }

  /** 04 §3 — gated 는 리허설 통과 전 PNR 진입 불가 */
  async passPnr(token: string): Promise<void> {
    const r = await this.#require(token)
    const gate = evaluateGate(r.profile, {
      settled: new Set(r.settled),
      submitted: new Set(r.submitted),
    })
    invariant(gate.pnrAllowed, 'PNR_BLOCKED', r.no)
    r.pnrPassedAt = this.#clock.now()
    await this.#store.put(r)
  }

  // ── 확정 (05 §9) ─────────────────────────────────────────────────────

  async outputs(token: string): Promise<BlockOutput[]> {
    return outputsOf(await this.#require(token))
  }

  /**
   * 이미 확정된 세션의 사양서를 다시 만든다.
   * settle() 은 상태를 옮기므로 두 번 부를 수 없다. 사양서는 확정 시점 입력에서
   * 결정적으로 재생성되므로 해시가 처음과 같다 — 그것이 이 함수가 안전한 이유다.
   */
  async specOf(token: string): Promise<{ spec: Spec; payload: string } | null> {
    const r = await this.#require(token)
    return r.settledAt === null ? null : buildSpec(r)
  }

  async settle(token: string): Promise<{ spec: Spec; payload: string }> {
    const r = await this.#require(token)
    const gate = evaluateGate(r.profile, {
      settled: new Set(r.settled),
      submitted: new Set(r.submitted),
      pendingNegotiations: pendingCount(r.negotiations),
    })
    // 05 §1 은 두 상황에 다른 코드를 준다. canSettle 에 미응답 역제안이
    // 포함돼 있으므로, 먼저 보지 않으면 구체적인 이유가 일반 코드에 묻힌다.
    const pending = pendingCount(r.negotiations)
    invariant(pending === 0, 'NEGOTIATION_PENDING', String(pending))
    invariant(gate.canSettle, 'GATE_LOCKED', 'not all required blocks settled')

    r.settledAt = this.#clock.now()
    r.state = transition(r.state, 'SETTLED')
    await this.#store.put(r)
    return buildSpec(r)
  }
}

// ── 순수 헬퍼 ───────────────────────────────────────────────────────────

/** 06 §5.3 잠금 게이지의 분모. 인장 대신 이것이 시그니처다. */
function totalLineCount(r: SessionRecord): number {
  let n = 0
  for (const b of r.profile.blocks) {
    if (b.config.kind === 'PAIRWISE') n += b.config.axes.length
    else if (b.config.kind === 'PICK_N') n += 1
    else if (b.config.kind === 'CHECKLIST' && b.config.mode === 'scope') n += 1
  }
  return n
}

function lockedLineCount(r: SessionRecord): number {
  let n = 0
  for (const b of r.profile.blocks) {
    if (b.config.kind === 'PAIRWISE') n += (r.choices[b.id] ?? []).length
    else if (b.config.kind === 'PICK_N') n += r.picks[b.id] === undefined ? 0 : 1
    else if (b.config.kind === 'CHECKLIST' && b.config.mode === 'scope') {
      n += r.settled.includes(b.id) ? 1 : 0
    }
  }
  return n
}

function applyOverrides(r: SessionRecord, lines: SpecLine[]): SpecLine[] {
  // 04 §5.3 — 조율 결과가 있으면 그 축은 owner 까지 함께 바뀐다
  return lines.map((l) => r.axisOverrides[l.key] ?? l)
}

function outputsOf(r: SessionRecord): BlockOutput[] {
  const out: BlockOutput[] = []
  for (const block of r.profile.blocks) {
    const config = block.config
    if (config.kind === 'PAIRWISE') {
      const choices = r.choices[block.id]
      if (choices === undefined || choices.length !== config.axes.length) continue
      out.push({
        blockId: block.id,
        lines: applyOverrides(r, linesFromChoices(config, choices)),
        lockedAt: r.settledAt,
        amountDeltaUsd: 0,
        daysDelta: 0,
      })
    } else if (config.kind === 'PICK_N') {
      const i = r.picks[block.id]
      if (i === undefined) continue
      const option = config.options[i]!
      out.push({
        blockId: block.id,
        lines: [
          { key: block.labelKey, value: option.labelKey, measure: option.measure, owner: 'CLIENT' },
        ],
        lockedAt: r.settledAt,
        amountDeltaUsd: 0,
        daysDelta: 0,
      })
    } else if (config.kind === 'CHECKLIST' && config.mode === 'scope') {
      if (!r.settled.includes(block.id)) continue
      const totals = totalsOf(r.profile, { scope: r.scope, assets: r.assets })
      const selected = config.items.filter((item, i) => r.scope[String(i)] ?? item.default).length
      out.push({
        blockId: block.id,
        lines: [
          {
            key: block.labelKey,
            value: block.labelKey,
            measure: selected + ' items',
            owner: 'CLIENT',
          },
        ],
        lockedAt: r.settledAt,
        amountDeltaUsd: totals.amountUsd,
        daysDelta: 0,
      })
    }
  }
  return out
}

function buildSpec(r: SessionRecord): { spec: Spec; payload: string } {
  const totals = totalsOf(r.profile, { scope: r.scope, assets: r.assets })
  const spec = compileSpec(r.profile, {
    no: r.no,
    outputs: outputsOf(r),
    amountUsd: totals.amountUsd,
    weeks: totals.weeks,
    revisions: totals.revisions,
    lockedAt: r.settledAt ?? new Date(0).toISOString(),
  })
  return { spec, payload: specPayload(spec) }
}
