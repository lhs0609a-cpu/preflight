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
  evaluateGate,
  formatSessionNo,
  invariant,
  linesFromChoices,
  progressOf,
  serializedPairAt,
  specPayload,
  totalsOf,
  transition,
  type AssetStates,
  type BlockConfig,
  type BlockOutput,
  type ChecklistSelection,
  type ClientBlockView,
  type CompiledProfile,
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
  seq(): number
}

export interface IssueInput {
  readonly proId: string
  readonly profile: CompiledProfile
  readonly clientLabel?: string
  readonly marketplace?: string
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

let fallbackSeq = 0
const defaultIds: Ids = {
  token: () => randomHex(24), // 192bit — NFR-5.1 하한 초과
  id: () => randomHex(16),
  seq: () => ++fallbackSeq,
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
    const no = formatSessionNo(d.getUTCFullYear(), d.getUTCMonth() + 1, this.#ids.seq())
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
      pendingNegotiations: 0,
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
      shareText:
        'Before we start, please pick a few options here — takes 5 minutes: ' + clientUrl,
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

  #viewOf(r: SessionRecord): ClientView {
    const gate = evaluateGate(r.profile, {
      settled: new Set(r.settled),
      submitted: new Set(r.submitted),
      pendingNegotiations: r.pendingNegotiations,
    })
    const totals = totalsOf(r.profile, { scope: r.scope, assets: r.assets })

    return {
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
      pendingNegotiations: r.pendingNegotiations,
    })
    invariant(gate.canSettle, 'GATE_LOCKED', 'not all required blocks settled')
    invariant(r.pendingNegotiations === 0, 'NEGOTIATION_PENDING', String(r.pendingNegotiations))

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

function outputsOf(r: SessionRecord): BlockOutput[] {
  const out: BlockOutput[] = []
  for (const block of r.profile.blocks) {
    const config = block.config
    if (config.kind === 'PAIRWISE') {
      const choices = r.choices[block.id]
      if (choices === undefined || choices.length !== config.axes.length) continue
      out.push({
        blockId: block.id,
        lines: linesFromChoices(config, choices),
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
