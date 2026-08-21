/**
 * Postgres 저장소 — 03 문서 스키마 위에서 도는 SessionStore / ProStore.
 *
 * 인메모리 구현과 **같은 계약 테스트**를 통과한다. 그것이 없으면
 * "저장소만 갈아끼우면 된다"는 말은 검증되지 않은 주장이다.
 */
import type {
  AssetStates,
  CompiledProfile,
  NegotiationProposal,
  RevisionRequest,
  Side,
  SpecLine,
} from '@preflight/core'
import type { Pro, ProStore, SessionRecord, SessionStore, TeamMember } from '@preflight/session'
import type { Sql } from './sql.ts'

interface ProRow {
  id: string
  email: string
  display_name: string
  locale: string
  timezone: string
  state: string
  billing_verified: boolean
}

export class PgProStore implements ProStore {
  constructor(private readonly sql: Sql) {}

  async put(pro: Pro): Promise<void> {
    await this.sql.query(
      `INSERT INTO pro (id, email, display_name, locale, timezone, state)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         display_name = EXCLUDED.display_name,
         locale = EXCLUDED.locale,
         timezone = EXCLUDED.timezone,
         state = EXCLUDED.state`,
      [pro.id, pro.email, pro.displayName, pro.locale, pro.timezone, pro.state],
    )

    // 03 §2.2 — billingVerified 는 파생값이다. verified_at 이 있는 행의 존재로 결정된다.
    // 불리언 컬럼을 따로 두면 두 진실이 생기고 반드시 어긋난다.
    if (pro.billingVerified) {
      await this.sql.query(
        `INSERT INTO billing_method (id, pro_id, provider, billing_key, verified_at)
         VALUES ($1, $2, 'test', 'bk_' || $2, now())
         ON CONFLICT (id) DO UPDATE SET verified_at = now()`,
        [`bm_${pro.id}`, pro.id],
      )
    } else {
      await this.sql.query(`DELETE FROM billing_method WHERE pro_id = $1`, [pro.id])
    }
  }

  async byId(id: string): Promise<Pro | undefined> {
    const { rows } = await this.sql.query<ProRow>(
      `SELECT p.id, p.email, p.display_name, p.locale, p.timezone, p.state,
              EXISTS (
                SELECT 1 FROM billing_method b
                WHERE b.pro_id = p.id AND b.verified_at IS NOT NULL
              ) AS billing_verified
         FROM pro p WHERE p.id = $1`,
      [id],
    )
    const r = rows[0]
    if (!r) return undefined
    return {
      id: r.id,
      email: r.email,
      displayName: r.display_name,
      locale: r.locale,
      timezone: r.timezone,
      state: r.state as Pro['state'],
      billingVerified: r.billing_verified === true,
    }
  }
}

interface SessionRow {
  id: string
  no: string
  token: string | null
  pro_id: string
  profile_snapshot: CompiledProfile | string
  client_label: string | null
  marketplace: string | null
  state: string
  scope: Record<string, boolean> | string
  assets: AssetStates | string
  negotiations: NegotiationProposal[] | string
  axis_overrides: Record<string, SpecLine> | string
  revisions_used: number
  requests: RevisionRequest[] | string
  review_gate: boolean
  reviewed_at: Date | string | null
  pnr_passed_at: Date | string | null
  opened_at: Date | string | null
  settled_at: Date | string | null
  created_at: Date | string
}

interface BlockRow {
  block_id: string
  block_type: string
  state: string
  answers: Side[] | string
  pick: number | null
}

const json = <T,>(v: T | string): T => (typeof v === 'string' ? (JSON.parse(v) as T) : v)
const iso = (v: Date | string | null): string | null =>
  v === null ? null : v instanceof Date ? v.toISOString() : new Date(v).toISOString()

export class PgSessionStore implements SessionStore {
  constructor(private readonly sql: Sql) {}

  /**
   * 03 §2.5 — 그 달의 다음 번호. 한 문장으로 끝나야 원자적이다.
   *
   * SELECT 로 읽고 UPDATE 로 쓰면 두 인스턴스가 같은 값을 읽는 창이 생기고,
   * 그게 정확히 session.no 의 UNIQUE 가 터지는 경로다. upsert 의 RETURNING 이
   * 그 창을 없앤다.
   */
  async nextSeq(period: string): Promise<number> {
    const { rows } = await this.sql.query<{ n: number }>(
      `INSERT INTO session_counter (period, n) VALUES ($1, 1)
       ON CONFLICT (period) DO UPDATE SET n = session_counter.n + 1
       RETURNING n`,
      [period],
    )
    return Number(rows[0]!.n)
  }

  async put(r: SessionRecord): Promise<void> {
    await this.sql.query(
      `INSERT INTO session (
         id, no, pro_id, profile_slug, profile_snapshot, client_label, marketplace,
         state, scope, assets, negotiations, axis_overrides, revisions_used,
         requests, review_gate, reviewed_at, pnr_passed_at, opened_at, settled_at, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       ON CONFLICT (id) DO UPDATE SET
         state = EXCLUDED.state,
         scope = EXCLUDED.scope,
         assets = EXCLUDED.assets,
         negotiations = EXCLUDED.negotiations,
         axis_overrides = EXCLUDED.axis_overrides,
         revisions_used = EXCLUDED.revisions_used,
         requests = EXCLUDED.requests,
         reviewed_at = EXCLUDED.reviewed_at,
         pnr_passed_at = EXCLUDED.pnr_passed_at,
         opened_at = EXCLUDED.opened_at,
         settled_at = EXCLUDED.settled_at`,
      [
        r.id,
        r.no,
        r.proId,
        r.profile.slug,
        JSON.stringify(r.profile),
        r.clientLabel,
        r.marketplace,
        r.state,
        JSON.stringify(r.scope),
        JSON.stringify(r.assets),
        JSON.stringify(r.negotiations),
        JSON.stringify(r.axisOverrides),
        r.revisionsUsed,
        JSON.stringify(r.requests),
        r.reviewGate,
        r.reviewedAt,
        r.pnrPassedAt,
        r.openedAt,
        r.settledAt,
        r.createdAt,
      ],
    )

    await this.sql.query(
      `INSERT INTO access_token (id, session_id, token, actor)
       VALUES ($1, $2, $3, 'CLIENT')
       ON CONFLICT (token) DO NOTHING`,
      [`at_${r.id}`, r.id, r.token],
    )

    // 블록별 진행 상태. flow 순서를 seq 로 남겨 정렬이 결정적이도록 한다.
    for (const [seq, blockId] of r.profile.flow.entries()) {
      const block = r.profile.blocks.find((b) => b.id === blockId)
      if (!block) continue
      const state = r.settled.includes(blockId)
        ? 'SETTLED'
        : r.submitted.includes(blockId)
          ? 'SUBMITTED'
          : 'OPEN'
      await this.sql.query(
        `INSERT INTO session_block (id, session_id, block_id, block_type, seq, state, answers, pick)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (session_id, block_id) DO UPDATE SET
           state = EXCLUDED.state,
           answers = EXCLUDED.answers,
           pick = EXCLUDED.pick`,
        [
          `${r.id}:${blockId}`,
          r.id,
          blockId,
          block.type,
          seq,
          state,
          JSON.stringify(r.choices[blockId] ?? []),
          r.picks[blockId] ?? null,
        ],
      )
    }

    // FR-7 팀원. 토큰은 발급 시 정해지고 바뀌지 않으므로 choices 만 갱신한다
    for (const m of r.members) {
      await this.sql.query(
        `INSERT INTO session_member (id, session_id, token, seq, choices)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET choices = EXCLUDED.choices`,
        [m.id, r.id, m.token, m.seq, JSON.stringify(m.choices)],
      )
    }
  }

  /**
   * FR-7 — 팀원 토큰으로 세션을 찾는다.
   *
   * token 에 UNIQUE 가 걸려 있어 한 번의 질의로 끝난다. 세션을 훑어 찾는 형태로
   * 두면 세션이 늘수록 느려지고, 토큰만으로 접근하는 제품에서 그건 곧 병목이다.
   */
  async byMemberToken(
    token: string,
  ): Promise<{ record: SessionRecord; memberId: string } | undefined> {
    const { rows } = await this.sql.query<{ id: string; session_id: string }>(
      `SELECT id, session_id FROM session_member WHERE token = $1`,
      [token],
    )
    const row = rows[0]
    if (!row) return undefined
    const record = await this.byId(row.session_id)
    return record === undefined ? undefined : { record, memberId: row.id }
  }

  async #members(sessionId: string): Promise<TeamMember[]> {
    const { rows } = await this.sql.query<{
      id: string
      token: string
      seq: number
      choices: Record<string, Side[]> | string
    }>(`SELECT id, token, seq, choices FROM session_member WHERE session_id = $1 ORDER BY seq`, [
      sessionId,
    ])
    return rows.map((m) => ({
      id: m.id,
      token: m.token,
      seq: Number(m.seq),
      choices: json<Record<string, Side[]>>(m.choices),
    }))
  }

  async #hydrate(row: SessionRow, token: string): Promise<SessionRecord> {
    const { rows: blocks } = await this.sql.query<BlockRow>(
      `SELECT block_id, block_type, state, answers, pick
         FROM session_block WHERE session_id = $1 ORDER BY seq`,
      [row.id],
    )

    const choices: Record<string, Side[]> = {}
    const picks: Record<string, number> = {}
    const settled: string[] = []
    const submitted: string[] = []

    for (const b of blocks) {
      const answers = json<Side[]>(b.answers)
      if (answers.length > 0) choices[b.block_id] = answers
      if (b.pick !== null) picks[b.block_id] = b.pick
      if (b.state === 'SETTLED') settled.push(b.block_id)
      if (b.state === 'SUBMITTED') submitted.push(b.block_id)
    }

    return {
      id: row.id,
      no: row.no,
      token,
      proId: row.pro_id,
      profile: json<CompiledProfile>(row.profile_snapshot),
      state: row.state as SessionRecord['state'],
      choices,
      picks,
      scope: json<Record<string, boolean>>(row.scope),
      assets: json<AssetStates>(row.assets),
      settled,
      submitted,
      negotiations: json<NegotiationProposal[]>(row.negotiations),
      axisOverrides: json<Record<string, SpecLine>>(row.axis_overrides),
      revisionsUsed: row.revisions_used,
      requests: json<RevisionRequest[]>(row.requests),
      members: await this.#members(row.id),
      reviewGate: row.review_gate === true,
      reviewedAt: iso(row.reviewed_at),
      pnrPassedAt: iso(row.pnr_passed_at),
      createdAt: iso(row.created_at)!,
      openedAt: iso(row.opened_at),
      settledAt: iso(row.settled_at),
      clientLabel: row.client_label,
      marketplace: row.marketplace,
    }
  }

  async byToken(token: string): Promise<SessionRecord | undefined> {
    const { rows } = await this.sql.query<SessionRow>(
      `SELECT s.*, t.token FROM session s
         JOIN access_token t ON t.session_id = s.id AND t.revoked_at IS NULL
        WHERE t.token = $1`,
      [token],
    )
    const row = rows[0]
    return row ? this.#hydrate(row, token) : undefined
  }

  async byId(id: string): Promise<SessionRecord | undefined> {
    const { rows } = await this.sql.query<SessionRow>(
      `SELECT s.*, t.token FROM session s
         LEFT JOIN access_token t ON t.session_id = s.id AND t.revoked_at IS NULL
        WHERE s.id = $1`,
      [id],
    )
    const row = rows[0]
    return row ? this.#hydrate(row, row.token ?? '') : undefined
  }

  async listByPro(proId: string): Promise<SessionRecord[]> {
    const { rows } = await this.sql.query<SessionRow>(
      `SELECT s.*, t.token FROM session s
         LEFT JOIN access_token t ON t.session_id = s.id AND t.revoked_at IS NULL
        WHERE s.pro_id = $1
        ORDER BY s.created_at`,
      [proId],
    )
    return Promise.all(rows.map((row) => this.#hydrate(row, row.token ?? '')))
  }
}
