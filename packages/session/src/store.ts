/**
 * 저장소 인터페이스.
 *
 * **비동기다.** M1.2 에서는 동기로 뒀는데, 그러면 Postgres 구현이 애초에
 * 불가능하다 — 인터페이스가 교체를 막고 있었다. 이걸 늦게 발견할수록 비싸진다.
 *
 * 03 문서 스키마로 가는 구현은 @preflight/db 에 있고, 두 구현은 같은 계약
 * 테스트를 통과한다. 그것이 "갈아끼우기가 싸다"를 주장이 아니라 사실로 만든다.
 */
import type {
  AssetStates,
  ChecklistSelection,
  CompiledProfile,
  NegotiationProposal,
  SessionState,
  Side,
  SpecLine,
} from '@preflight/core'

/** 03 §2.1 */
export interface Pro {
  readonly id: string
  readonly email: string
  readonly displayName: string
  /** 01 §1 — 프리랜서 UI 로케일 */
  readonly locale: string
  /** 03 §2.1 — 알림 발송 시각 계산. 시차가 이 제품의 핵심이라 필수 */
  readonly timezone: string
  readonly state: 'ACTIVE' | 'BILLING_HOLD' | 'SUSPENDED'
  /**
   * 03 §2.2 — billing_method.verified_at IS NOT NULL.
   * 미등록이면 세션 발급 불가. 회수율의 1차 방어선이다 (FR-1.4).
   */
  readonly billingVerified: boolean
}

export interface SessionRecord {
  readonly id: string
  readonly no: string
  readonly token: string
  readonly proId: string
  /** 12 §4.4 — 발급 시점의 **컴파일된** 프로파일. 개정돼도 진행 중 세션은 안 흔들린다 */
  readonly profile: CompiledProfile
  state: SessionState
  /** blockId → 축별 선택. 값이 아니라 side 만 기록한다 */
  choices: Record<string, Side[]>
  picks: Record<string, number>
  scope: ChecklistSelection
  assets: AssetStates
  settled: string[]
  submitted: string[]
  /** 04 §5 — 근거는 여기 남고 클라이언트에게는 내려가지 않는다 */
  negotiations: NegotiationProposal[]
  /** 조율 결과로 확정된 축. owner 가 책임 귀속 기록이다 (04 §5.3) */
  axisOverrides: Record<string, SpecLine>
  /** 04 §4 — 차감된 수정 횟수 */
  revisionsUsed: number
  /** 04 §3 — 되돌림 한계점 통과 시각 */
  pnrPassedAt: string | null
  readonly createdAt: string
  openedAt: string | null
  settledAt: string | null
  readonly clientLabel: string | null
  readonly marketplace: string | null
}

/** FR-12 — 알림 설정. quietHours 는 프리랜서 타임존 기준이다 (05 §12) */
export interface NotifyPrefs {
  readonly channels: readonly string[]
  readonly quietHours?: { readonly from: string; readonly to: string; readonly mode: 'digest' | 'silent' }
}

export interface ProStore {
  put(pro: Pro): Promise<void>
  byId(id: string): Promise<Pro | undefined>
  byEmail?(email: string): Promise<Pro | undefined>
}

export interface SessionStore {
  put(record: SessionRecord): Promise<void>
  byToken(token: string): Promise<SessionRecord | undefined>
  byId(id: string): Promise<SessionRecord | undefined>
  listByPro(proId: string): Promise<SessionRecord[]>
}

// ── 인메모리 (개발·테스트) ─────────────────────────────────────────────

export class InMemoryProStore implements ProStore {
  readonly #byId = new Map<string, Pro>()

  async put(pro: Pro): Promise<void> {
    this.#byId.set(pro.id, pro)
  }

  async byId(id: string): Promise<Pro | undefined> {
    return this.#byId.get(id)
  }

  async byEmail(email: string): Promise<Pro | undefined> {
    return [...this.#byId.values()].find((p) => p.email === email)
  }
}

export class InMemorySessionStore implements SessionStore {
  readonly #byToken = new Map<string, SessionRecord>()
  readonly #byId = new Map<string, SessionRecord>()

  async put(record: SessionRecord): Promise<void> {
    this.#byToken.set(record.token, record)
    this.#byId.set(record.id, record)
  }

  async byToken(token: string): Promise<SessionRecord | undefined> {
    return this.#byToken.get(token)
  }

  async byId(id: string): Promise<SessionRecord | undefined> {
    return this.#byId.get(id)
  }

  async listByPro(proId: string): Promise<SessionRecord[]> {
    return [...this.#byId.values()]
      .filter((r) => r.proId === proId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }
}
