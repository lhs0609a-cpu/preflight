/**
 * 세션 저장소.
 *
 * M1 은 인메모리로 시작한다. 03 문서의 Postgres 스키마로 갈아끼우는 것은
 * 이 인터페이스 뒤에서 끝난다 — 화면과 서비스는 아무것도 모른다.
 *
 * 화면을 먼저 만드는 이유: 이 제품의 생사는 완료율 60% 이고(07 §5.2)
 * 그건 화면에서만 검증된다. DB 를 먼저 깔아도 그 리스크는 줄지 않는다.
 */
import type { CompiledProfile, SessionState, Side } from '@preflight/core'
import type { AssetStates, ChecklistSelection } from '@preflight/core'

export interface SessionRecord {
  readonly id: string
  readonly no: string
  readonly token: string
  readonly profile: CompiledProfile
  state: SessionState
  /** blockId → 축별 선택. 값이 아니라 side 만 기록한다 */
  choices: Record<string, Side[]>
  /** blockId → 고른 옵션 인덱스 */
  picks: Record<string, number>
  scope: ChecklistSelection
  assets: AssetStates
  settled: string[]
  submitted: string[]
  pendingNegotiations: number
  readonly createdAt: string
  openedAt: string | null
  settledAt: string | null
  /** 프리랜서가 붙인 메모. 클라이언트 화면에 나가지 않는다 */
  readonly clientLabel: string | null
  readonly marketplace: string | null
}

export interface SessionStore {
  put(record: SessionRecord): void
  byToken(token: string): SessionRecord | undefined
  byId(id: string): SessionRecord | undefined
  listByPro(): SessionRecord[]
}

export class InMemorySessionStore implements SessionStore {
  readonly #byToken = new Map<string, SessionRecord>()
  readonly #byId = new Map<string, SessionRecord>()

  put(record: SessionRecord): void {
    this.#byToken.set(record.token, record)
    this.#byId.set(record.id, record)
  }

  byToken(token: string): SessionRecord | undefined {
    return this.#byToken.get(token)
  }

  byId(id: string): SessionRecord | undefined {
    return this.#byId.get(id)
  }

  listByPro(): SessionRecord[] {
    return [...this.#byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }
}
