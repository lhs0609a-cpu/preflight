/**
 * 세션 서비스 — 05 문서 엔드포인트의 순수 대응물.
 *
 * HTTP 계층은 이 메서드들을 얇게 감싸기만 한다. 그래서 API 를 붙이기 전에
 * 화면을 붙일 수 있고, 화면이 붙은 뒤에 저장소를 갈아끼울 수 있다.
 *
 * 시계와 난수를 주입받는다. 순수하게 유지하기 위해서이기도 하고,
 * 테스트가 결정적이어야 사양서 해시를 검증할 수 있기 때문이기도 하다.
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
  type BlockOutput,
  type ChecklistSelection,
  type ClientBlockView,
  type CompiledProfile,
  type SerializedPair,
  type Side,
  type Spec,
} from '@preflight/core'
import { InMemorySessionStore, type SessionRecord, type SessionStore } from './store.ts'

export interface Clock {
  now(): string
}

export interface Ids {
  /** NFR-5.1 — 128bit 이상 */
  token(): string
  id(): string
  /** 03 §2.5 — 월별 일련번호 */
  seq(): number
}

export interface IssueInput {
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

/** 05 §5 `GET /s/{token}` — 문장이 없다. 아이콘 키와 수치만. */
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
  readonly clock?: Clock
  readonly ids?: Ids
  readonly baseUrl?: string
}

const defaultClock: Clock = { now: () => new Date().toISOString() }

let fallbackSeq = 0
const defaultIds: Ids = {
  token: () => cryptoToken(),
  id: () => cryptoToken().slice(0, 32),
  seq: () => ++fallbackSeq,
}

function cryptoToken(): string {
  const bytes = new Uint8Array(24) // 192bit — NFR-5.1 하한 초과
  globalThis.crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export class SessionService {
  readonly #store: SessionStore
  readonly #clock: Clock
  readonly #ids: Ids
  readonly #baseUrl: string

  constructor(opts: ServiceOptions = {}) {
    this.#store = opts.store ?? new InMemorySessionStore()
    this.#clock = opts.clock ?? defaultClock
    this.#ids = opts.ids ?? defaultIds
    this.#baseUrl = opts.baseUrl ?? 'https://pf.work'
  }

  get store(): SessionStore {
    return this.#store
  }

  // ── 발급 (05 §5 POST /sessions) ──────────────────────────────────────────

  issue(input: IssueInput): IssueResult {
    const now = this.#clock.now()
    const d = new Date(now)
    const no = formatSessionNo(d.getUTCFullYear(), d.getUTCMonth() + 1, this.#ids.seq())
    const token = this.#ids.token()

    const record: SessionRecord = {
      id: this.#ids.id(),
      no,
      token,
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
    this.#store.put(record)

    const clientUrl = `${this.#baseUrl}/s/${token}`
    return {
      id: record.id,
      no,
      token,
      clientUrl,
      // 09 §2.1 — 생성만 한다. 전송은 사람이 한다.
      shareText: `Before we start, please pick a few options here — takes 5 minutes: ${clientUrl}`,
      state: 'ISSUED',
    }
  }

  // ── 조회 ─────────────────────────────────────────────────────────────────

  #require(token: string): SessionRecord {
    const r = this.#store.byToken(token)
    invariant(r !== undefined, 'UNAUTHORIZED', token.slice(0, 8))
    return r
  }

  /** 첫 열람이 상태를 옮긴다 (04 §1.1). */
  open(token: string): ClientView {
    const r = this.#require(token)
    if (r.state === 'ISSUED') {
      r.state = transition(r.state, 'OPENED')
      r.openedAt = this.#clock.now()
    }
    return this.view(token)
  }

  view(token: string): ClientView {
    const r = this.#require(token)
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
      locked: this.#lockedLineCount(r),
      total: this.#totalLineCount(r),
      amountUsd: totals.amountUsd,
      weeks: totals.weeks,
      revisions: totals.revisions,
      startBlocked: totals.startBlocked,
      delayedDays: totals.delayedDays,
      canSettle: gate.canSettle,
    }
  }

  /** 06 §5.3 잠금 게이지의 분자·분모. 인장 대신 이것이 시그니처다. */
  #totalLineCount(r: SessionRecord): number {
    let n = 0
    for (const b of r.profile.blocks) {
      if (b.config.kind === 'PAIRWISE') n += b.config.axes.length
      else if (b.config.kind === 'PICK_N') n += 1
      else if (b.config.kind === 'CHECKLIST' && b.config.mode === 'scope') n += 1
    }
    return n
  }

  #lockedLineCount(r: SessionRecord): number {
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

  // ── 블록 실행 (05 §6) ────────────────────────────────────────────────────

  #openBlock(r: SessionRecord, blockId: string): void {
    const gate = evaluateGate(r.profile, {
      settled: new Set(r.settled),
      submitted: new Set(r.submitted),
    })
    const state = gate.states.get(blockId)
    invariant(state === 'OPEN', 'GATE_LOCKED', `${blockId}:${state ?? 'UNKNOWN'}`)
  }

  #config(r: SessionRecord, blockId: string) {
    const block = r.profile.blocks.find((b) => b.id === blockId)
    invariant(block !== undefined, 'BLOCK_NOT_FOUND', blockId)
    return block.config
  }

  pair(token: string, blockId: string): SerializedPair | null {
    const r = this.#require(token)
    const cursor = (r.choices[blockId] ?? []).length
    return serializedPairAt(this.#config(r, blockId), cursor)
  }

  answer(token: string, blockId: string, side: Side): AnswerResult {
    const r = this.#require(token)
    this.#openBlock(r, blockId)
    if (r.state === 'OPENED') r.state = transition(r.state, 'IN_PROGRESS')

    const config = this.#config(r, blockId)
    const choices = [...(r.choices[blockId] ?? []), side]
    const { total, done } = progressOf(config, choices.length)
    invariant(choices.length <= total, 'CURSOR_OUT_OF_RANGE', String(choices.length))
    r.choices[blockId] = choices

    return {
      cursor: choices.length,
      total,
      done,
      nextPair: done ? null : serializedPairAt(config, choices.length),
    }
  }

  /** 뒤로 가기. C-02 하단의 화살표 하나가 이것이다. */
  undo(token: string, blockId: string): AnswerResult {
    const r = this.#require(token)
    const config = this.#config(r, blockId)
    const choices = [...(r.choices[blockId] ?? [])]
    choices.pop()
    r.choices[blockId] = choices
    const { total, done } = progressOf(config, choices.length)
    return { cursor: choices.length, total, done, nextPair: serializedPairAt(config, choices.length) }
  }

  pick(token: string, blockId: string, index: number): void {
    const r = this.#require(token)
    this.#openBlock(r, blockId)
    const config = this.#config(r, blockId)
    invariant(config.kind === 'PICK_N', 'BLOCK_NOT_PICK_N', config.kind)
    invariant(index >= 0 && index < config.options.length, 'PICK_OUT_OF_RANGE', String(index))
    r.picks[blockId] = index
  }

  setScope(token: string, selection: ChecklistSelection): ClientView {
    const r = this.#require(token)
    r.scope = { ...r.scope, ...selection }
    return this.view(token)
  }

  setAssets(token: string, states: AssetStates): ClientView {
    const r = this.#require(token)
    r.assets = { ...r.assets, ...states }
    return this.view(token)
  }

  /** 05 §6 POST /settle */
  settleBlock(token: string, blockId: string): ClientView {
    const r = this.#require(token)
    this.#openBlock(r, blockId)
    const config = this.#config(r, blockId)

    if (config.kind === 'PAIRWISE') {
      const { done } = progressOf(config, (r.choices[blockId] ?? []).length)
      invariant(done, 'BLOCK_INCOMPLETE', blockId)
    }
    if (config.kind === 'PICK_N') {
      invariant(r.picks[blockId] !== undefined, 'BLOCK_INCOMPLETE', blockId)
    }

    if (!r.settled.includes(blockId)) r.settled.push(blockId)
    if (r.state === 'OPENED') r.state = transition(r.state, 'IN_PROGRESS')
    return this.view(token)
  }

  // ── 확정 (05 §9) ─────────────────────────────────────────────────────────

  outputs(token: string): BlockOutput[] {
    const r = this.#require(token)
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
        const selected = config.items.filter(
          (_, i) => r.scope[String(i)] ?? config.items[i]!.default,
        ).length
        out.push({
          blockId: block.id,
          lines: [
            { key: block.labelKey, value: block.labelKey, measure: `${selected} items`, owner: 'CLIENT' },
          ],
          lockedAt: r.settledAt,
          amountDeltaUsd: totals.amountUsd,
          daysDelta: 0,
        })
      }
    }
    return out
  }

  #buildSpec(token: string, r: SessionRecord): { spec: Spec; payload: string } {
    const totals = totalsOf(r.profile, { scope: r.scope, assets: r.assets })
    const spec = compileSpec(r.profile, {
      no: r.no,
      outputs: this.outputs(token),
      amountUsd: totals.amountUsd,
      weeks: totals.weeks,
      revisions: totals.revisions,
      lockedAt: r.settledAt ?? this.#clock.now(),
    })
    return { spec, payload: specPayload(spec) }
  }

  /**
   * 이미 확정된 세션의 사양서를 다시 만든다.
   *
   * settle() 을 두 번 부를 수는 없다 — 상태를 옮기기 때문이다.
   * 사양서는 확정 시점 입력으로부터 결정적으로 재생성되므로
   * 해시가 처음과 같다. 그것이 이 함수가 안전한 이유다.
   */
  specOf(token: string): { spec: Spec; payload: string } | null {
    const r = this.#require(token)
    if (r.settledAt === null) return null
    return this.#buildSpec(token, r)
  }

  settle(token: string): { spec: Spec; payload: string } {
    const r = this.#require(token)
    const gate = evaluateGate(r.profile, {
      settled: new Set(r.settled),
      submitted: new Set(r.submitted),
      pendingNegotiations: r.pendingNegotiations,
    })
    invariant(gate.canSettle, 'GATE_LOCKED', 'not all required blocks settled')
    invariant(r.pendingNegotiations === 0, 'NEGOTIATION_PENDING', String(r.pendingNegotiations))

    r.settledAt = this.#clock.now()
    r.state = transition(r.state, 'SETTLED')
    return this.#buildSpec(token, r)
  }
}
