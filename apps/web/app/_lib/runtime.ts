/**
 * 앱 런타임 — M1 은 인메모리다.
 *
 * 03 문서의 Postgres 로 갈아끼우는 것은 SessionStore 구현 하나를 바꾸는
 * 일이며, 화면과 라우트는 아무것도 모른다.
 *
 * 개발 서버의 HMR 이 모듈을 다시 평가해도 세션이 날아가지 않도록
 * globalThis 에 매단다.
 */
import {
  InMemoryProStore,
  InMemorySessionStore,
  ProService,
  SessionService,
} from '@preflight/session'
import { compileAllProfiles, loadLabelBundle } from '@preflight/catalog'
import { registerM0Renderers } from '@preflight/render'
import type { CompiledProfile } from '@preflight/core'

registerM0Renderers()

/** M1 데모 계정. P-01 가입 화면이 붙으면 실제 세션 사용자로 대체된다. */
export const DEMO_PRO_ID = 'pro-demo'

interface Runtime {
  readonly service: SessionService
  readonly proService: ProService
  readonly proId: string
  readonly profiles: readonly CompiledProfile[]
  /** 클라이언트 화면이 쓰는 사전. 06 대로 영문 고정이다 — 클라이언트는 로케일이 없다 */
  readonly dict: Readonly<Record<string, string>>
  /** 프리랜서 화면용 8개 로케일 (FR-8.6) */
  readonly bundle: Readonly<Record<string, Readonly<Record<string, string>>>>
  seq: number
}

const KEY = Symbol.for('preflight.runtime')
const g = globalThis as unknown as Record<symbol, Runtime | undefined>

function build(): Runtime {
  const state = { seq: 0 }
  const service = new SessionService({
    store: new InMemorySessionStore(),
    pros: new InMemoryProStore(),
    baseUrl: process.env['PF_BASE_URL'] ?? 'http://localhost:3100',
    ids: {
      token: () => randomHex(24),
      id: () => randomHex(16),
      seq: () => ++state.seq,
    },
  })
  // FR-1.4 — 빌링키가 등록된 계정만 링크를 발급할 수 있다.
  // 데모 계정은 등록된 것으로 세운다. 게이트 자체는 service.issue() 가 건다.
  void service.pros.put({
    id: DEMO_PRO_ID,
    email: 'demo@pf.work',
    displayName: 'Demo',
    locale: 'ko',
    timezone: 'Asia/Seoul',
    state: 'ACTIVE',
    billingVerified: true,
  })

  const bundle = loadLabelBundle()
  return {
    service,
    proService: new ProService(service.pros, () => randomHex(8)),
    proId: DEMO_PRO_ID,
    profiles: compileAllProfiles(),
    dict: bundle.en,
    bundle,
    get seq() {
      return state.seq
    },
    set seq(v: number) {
      state.seq = v
    },
  }
}

function randomHex(bytes: number): string {
  const b = new Uint8Array(bytes)
  globalThis.crypto.getRandomValues(b)
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

export function runtime(): Runtime {
  const existing = g[KEY]
  if (existing) return existing
  const created = build()
  g[KEY] = created
  return created
}

export function profileBySlug(slug: string): CompiledProfile | undefined {
  return runtime().profiles.find((p) => p.slug === slug)
}
