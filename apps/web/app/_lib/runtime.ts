/**
 * 앱 런타임.
 *
 * DATABASE_URL 이 있으면 Postgres, 없으면 인메모리로 뜬다.
 *
 * 서버리스에서는 요청마다 다른 인스턴스가 뜰 수 있어 인메모리 세션이 사라진다.
 * 링크를 열었다 닫으면 진행이 날아간다는 뜻이고 그건 데모로도 못 쓴다.
 * 저장소가 이미 계약 테스트로 교체 가능하게 돼 있으므로 여기서 고르기만 한다.
 *
 * 개발 서버의 HMR 이 모듈을 다시 평가해도 상태가 날아가지 않도록
 * globalThis 에 매단다.
 */
import {
  InMemoryProStore,
  InMemorySessionStore,
  ProService,
  SessionService,
  type ProStore,
  type SessionStore,
} from '@preflight/session'
import { PgProStore, PgSessionStore, migrate, pgSql } from '@preflight/db'
import { compileAllProfiles, loadLabelBundle } from '@preflight/catalog'
import { registerM0Renderers } from '@preflight/render'
import type { CompiledProfile } from '@preflight/core'

registerM0Renderers()

/** M1 데모 계정. 실제 인증이 붙으면 세션 사용자로 대체된다. */
export const DEMO_PRO_ID = 'pro-demo'

export interface Runtime {
  readonly service: SessionService
  readonly proService: ProService
  readonly proId: string
  readonly backend: 'postgres' | 'memory'
  readonly profiles: readonly CompiledProfile[]
  /** 클라이언트 화면용 사전. 06 대로 영문 고정 — 클라이언트는 로케일이 없다 */
  readonly dict: Readonly<Record<string, string>>
  /** 프리랜서 화면용 8개 로케일 (FR-8.6) */
  readonly bundle: Readonly<Record<string, Readonly<Record<string, string>>>>
}

const KEY = Symbol.for('preflight.runtime')
const g = globalThis as unknown as Record<symbol, Promise<Runtime> | undefined>

function randomHex(bytes: number): string {
  const b = new Uint8Array(bytes)
  globalThis.crypto.getRandomValues(b)
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

async function stores(): Promise<{
  sessions: SessionStore
  pros: ProStore
  backend: 'postgres' | 'memory'
}> {
  const url = process.env['DATABASE_URL']
  if (url === undefined || url.length === 0) {
    return { sessions: new InMemorySessionStore(), pros: new InMemoryProStore(), backend: 'memory' }
  }

  // pg 는 운영에서만 필요하다. 정적 import 로 두면 인메모리로 도는 개발·테스트가
  // 드라이버를 끌고 온다.
  const { Pool } = await import('pg')
  const pool = new Pool({
    connectionString: url,
    // 서버리스는 인스턴스가 여럿이라 풀을 작게 잡는다
    max: 3,
    ssl: url.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
  })
  const sql = pgSql(pool)
  await migrate(sql)
  return { sessions: new PgSessionStore(sql), pros: new PgProStore(sql), backend: 'postgres' }
}

function baseUrl(): string {
  const explicit = process.env['PF_BASE_URL']
  if (explicit !== undefined && explicit.length > 0) return explicit
  const vercel = process.env['VERCEL_PROJECT_PRODUCTION_URL'] ?? process.env['VERCEL_URL']
  if (vercel !== undefined && vercel.length > 0) return `https://${vercel}`
  return 'http://localhost:3100'
}

async function build(): Promise<Runtime> {
  const { sessions, pros, backend } = await stores()

  const service = new SessionService({
    store: sessions,
    pros,
    baseUrl: baseUrl(),
    ids: {
      token: () => randomHex(24),
      id: () => randomHex(16),
    },
  })

  // FR-1.4 — 빌링키가 등록된 계정만 링크를 발급할 수 있다.
  // 데모 계정은 등록된 상태로 세운다. 게이트 자체는 service.issue() 가 건다.
  if ((await pros.byId(DEMO_PRO_ID)) === undefined) {
    await pros.put({
      id: DEMO_PRO_ID,
      email: 'demo@pf.work',
      displayName: 'Demo',
      locale: 'ko',
      timezone: 'Asia/Seoul',
      state: 'ACTIVE',
      billingVerified: true,
    })
  }

  const bundle = loadLabelBundle()
  return {
    service,
    proService: new ProService(pros, () => randomHex(8)),
    proId: DEMO_PRO_ID,
    backend,
    profiles: compileAllProfiles(),
    dict: bundle.en,
    bundle,
  }
}

export function runtime(): Promise<Runtime> {
  const existing = g[KEY]
  if (existing) return existing
  const created = build()
  g[KEY] = created
  return created
}
