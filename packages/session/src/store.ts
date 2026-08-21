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
  RevisionRequest,
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

/**
 * C-09 팀원 — FR-7.
 *
 * 이름이 없다. 화면은 A · B · C 순서만 보여준다 — 이름을 넣으면 로케일이
 * 필요해지고, 무엇보다 "누가 틀렸나" 를 가리키는 화면이 된다. 여기서 볼 것은
 * 사람이 아니라 **어느 축이 갈렸는가** 하나다 (06 §C-09).
 */
export interface TeamMember {
  readonly id: string
  /** 이 팀원 전용 링크. 주 클라이언트 토큰과 같은 강도다 (NFR-5.1) */
  readonly token: string
  /** 화면의 A · B · C */
  readonly seq: number
  /** blockId → 축별 선택. 주 클라이언트의 choices 와 같은 모양 */
  choices: Record<string, Side[]>
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
  /** FR-9 — 제출된 수정 요청. 판정만 하고 버리면 프리랜서가 볼 것이 없다 */
  requests: RevisionRequest[]
  /**
   * FR-7 — 팀원별 선택. 최종 사양은 **주 클라이언트의 것**으로 간다.
   * 대조는 정보 제공이다 — 시스템은 어느 쪽도 막지 않는다 (04 §5.3).
   */
  members: TeamMember[]
  /** 04 §3 — 되돌림 한계점 통과 시각 */
  pnrPassedAt: string | null
  /**
   * 04 §5.2 — 클라이언트가 전 블록을 확정한 뒤 프리랜서 검토를 거칠지.
   *
   * 발급 시 정해지고 이후 바뀌지 않는다. 진행 중에 켜면 클라이언트가 이미 본
   * 완료 화면이 대기 화면으로 되돌아간다.
   *
   * 기본은 꺼짐이다. 켜면 클라이언트가 다시 와야 하는데 알림 전송 채널이
   * 아직 없어서(13 §6), 상시로 켜면 세션이 그냥 멈춘다. 링크 전달을 이미
   * 사람이 손으로 하므로 "다시 열어주세요" 도 같은 경로로 보내면 된다.
   */
  readonly reviewGate: boolean
  /**
   * 04 §5.2 2단계가 끝난 시각. 프리랜서가 역제안을 올렸거나 그냥 통과시킨 때다.
   *
   * 관문을 "켜져 있음" 하나로만 판단하면, 검토가 끝나고 클라이언트가 역제안에
   * 전부 응답한 뒤에도 확정이 막힌다 — 04 §5.2 4번("전 항목 응답 시 SETTLED")이
   * 성립하지 않는다. 관문은 켜짐이 아니라 **아직 검토 전**일 때 막는 것이다.
   */
  reviewedAt: string | null
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
  /**
   * 03 §2.5 — 그 달의 다음 번호. **원자적이어야 한다.**
   *
   * 메모리 카운터로 두면 서버리스에서 두 인스턴스가 같은 번호를 발급하고
   * session.no 의 UNIQUE 가 터진다. 사용자에게는 발급 실패로 보인다.
   * period 는 'YYYYMM' — 번호가 PF-YYMM-NNNN 이라 달마다 1부터 다시 센다.
   */
  nextSeq(period: string): Promise<number>
  /** FR-7 — 팀원 토큰으로 세션을 찾는다. 없으면 undefined */
  byMemberToken(token: string): Promise<{ record: SessionRecord; memberId: string } | undefined>
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
  readonly #seq = new Map<string, number>()

  async nextSeq(period: string): Promise<number> {
    const n = (this.#seq.get(period) ?? 0) + 1
    this.#seq.set(period, n)
    return n
  }

  async byMemberToken(
    token: string,
  ): Promise<{ record: SessionRecord; memberId: string } | undefined> {
    for (const r of this.#byId.values()) {
      const m = r.members.find((x) => x.token === token)
      if (m !== undefined) return { record: r, memberId: m.id }
    }
    return undefined
  }

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
