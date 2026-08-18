/**
 * 클라이언트 한 명이 링크를 열고 사양을 확정하기까지 — 05 문서 전 구간.
 *
 * **인메모리와 Postgres 양쪽에서 같은 테스트가 돈다.**
 * 이게 없으면 "저장소만 갈아끼우면 된다"는 검증되지 않은 주장이다.
 * Postgres 쪽은 PGlite 로 03 문서의 진짜 스키마 위에서 실행된다.
 */
import { createHash } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  SessionService,
  type Clock,
  type Ids,
  type Pro,
  type ProStore,
  type SessionStore,
} from '@preflight/session'
import { renderOfferText, renderSheet, type Side } from '@preflight/core'
import { compileAllProfiles } from './profiles.ts'
import { STORE_ADAPTERS, type StoreBundle } from './stores.ts'

const profiles = compileAllProfiles()
const web = profiles.find((p) => p.slug === 'web')!
const photo = profiles.find((p) => p.slug === 'photo')!

const PRO: Pro = {
  id: 'pro-1',
  email: 'pro@example.com',
  displayName: 'Pro',
  locale: 'ko',
  timezone: 'Asia/Seoul',
  state: 'ACTIVE',
  billingVerified: true,
}

/**
 * 결정적 시계·난수. 사양서 해시를 검증하려면 필수다.
 *
 * 카운터는 **어댑터당 하나**여야 한다. 서비스 인스턴스마다 새로 만들면
 * 세션 id 와 no 가 충돌하고, Postgres 는 UNIQUE 제약으로 그것을 거부한다.
 * 인메모리는 조용히 덮어써서 통과한다 — 계약 테스트가 그 차이를 잡았다.
 */
function deterministic(): { clock: Clock; ids: Ids } {
  let n = 0
  let seq = 141
  return {
    clock: { now: () => '2026-09-02T00:00:00.000Z' },
    ids: {
      token: () => `tok${String(++n).padStart(6, '0')}`,
      id: () => `id${String(n).padStart(6, '0')}`,
      seq: () => ++seq,
    },
  }
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex')

describe.each(STORE_ADAPTERS)('저장소: $name', ({ make }) => {
  let bundle: StoreBundle
  let sessions: SessionStore
  let pros: ProStore

  beforeAll(async () => {
    bundle = await make()
    gen = deterministic()
    sessions = bundle.sessions
    pros = bundle.pros
    await pros.put(PRO)
  })

  afterAll(async () => {
    await bundle.close()
  })

  let gen: { clock: Clock; ids: Ids }
  const svc = () => new SessionService({ store: sessions, pros, ...gen })

  describe('링크 발급 — 05 §5 · FR-1.4', () => {
    it('영문 안내문과 링크를 만든다. 전송 기능은 없다', async () => {
      const r = await svc().issue({ proId: PRO.id, profile: web, clientLabel: 'Acme Corp' })
      expect(r.no).toMatch(/^PF-2609-\d{4}$/u)
      expect(r.clientUrl).toContain('/s/tok')
      expect(r.shareText).toContain(r.clientUrl)
      expect(r.shareText).toContain('5 minutes')
      expect(r.state).toBe('ISSUED')
    })

    it('빌링키가 없으면 링크를 발급하지 않는다 — 회수율 1차 방어선', async () => {
      await pros.put({ ...PRO, id: 'pro-nobilling', email: 'nb@example.com', billingVerified: false })
      await expect(
        svc().issue({ proId: 'pro-nobilling', profile: web }),
      ).rejects.toThrow(/BILLING_REQUIRED/u)
    })

    it('정지된 계정은 발급할 수 없다', async () => {
      await pros.put({ ...PRO, id: 'pro-susp', email: 's@example.com', state: 'SUSPENDED' })
      await expect(svc().issue({ proId: 'pro-susp', profile: web })).rejects.toThrow(/PRO_SUSPENDED/u)
    })

    it('없는 프리랜서로는 발급할 수 없다', async () => {
      await expect(svc().issue({ proId: 'ghost', profile: web })).rejects.toThrow(/UNAUTHORIZED/u)
    })
  })

  describe('클라이언트 전 구간 — web', () => {
    it('열람 → 카드 → 구조 → 범위 → 확정', async () => {
      const s = svc()
      const { token } = await s.issue({ proId: PRO.id, profile: web })

      let view = await s.open(token)
      expect(view.cursor).toBe('taste')
      expect(view.locked).toBe(0)
      expect(view.total).toBe(8) // 축 6 + 구조 1 + 범위 1

      for (let i = 0; i < 6; i++) {
        expect(await s.pair(token, 'taste'), `cursor ${i}`).not.toBeNull()
        const r = await s.answer(token, 'taste', (i % 2 === 0 ? 'a' : 'b') as Side)
        expect(r.cursor).toBe(i + 1)
        expect(r.done).toBe(i === 5)
      }
      expect(await s.pair(token, 'taste')).toBeNull()
      view = await s.settleBlock(token, 'taste')
      expect(view.locked).toBe(6)

      expect(view.cursor).toBe('structure')
      await s.pick(token, 'structure', 1)
      view = await s.settleBlock(token, 'structure')
      expect(view.locked).toBe(7)

      // 06 C-07 의 숫자
      expect(view.cursor).toBe('scope')
      expect(view.amountUsd).toBe(380)
      expect(view.weeks).toBe(6)
      view = await s.setScope(token, { '3': true })
      expect(view.amountUsd).toBe(440)
      view = await s.settleBlock(token, 'scope')
      expect(view.canSettle).toBe(true)

      const { spec, payload } = await s.settle(token)
      expect(spec.no).toMatch(/^PF-2609-\d{4}$/u)
      expect(spec.amountUsd).toBe(440)
      expect(spec.lines).toHaveLength(8)
      expect(spec.lines[0]!.measure).toBe('padding 32px')
      expect(sha(payload)).toHaveLength(64)
    })

    it('확정된 세션의 사양서를 다시 만들어도 해시가 같다', async () => {
      const s = svc()
      const { token } = await s.issue({ proId: PRO.id, profile: web })
      await s.open(token)
      for (let i = 0; i < 6; i++) await s.answer(token, 'taste', 'a')
      await s.settleBlock(token, 'taste')
      await s.pick(token, 'structure', 0)
      await s.settleBlock(token, 'structure')
      await s.settleBlock(token, 'scope')
      const first = await s.settle(token)
      const again = await s.specOf(token)
      expect(again).not.toBeNull()
      expect(sha(again!.payload)).toBe(sha(first.payload))
    })

    it('순서를 건너뛸 수 없다', async () => {
      const s = svc()
      const { token } = await s.issue({ proId: PRO.id, profile: web })
      await s.open(token)
      await expect(s.pick(token, 'structure', 0)).rejects.toThrow(/GATE_LOCKED/u)
      await expect(s.settleBlock(token, 'scope')).rejects.toThrow(/GATE_LOCKED/u)
    })

    it('카드를 다 넘기기 전에는 블록을 확정할 수 없다', async () => {
      const s = svc()
      const { token } = await s.issue({ proId: PRO.id, profile: web })
      await s.open(token)
      await s.answer(token, 'taste', 'a')
      await expect(s.settleBlock(token, 'taste')).rejects.toThrow(/BLOCK_INCOMPLETE/u)
    })

    it('뒤로 가면 커서가 돌아오고 같은 축이 다시 나온다', async () => {
      const s = svc()
      const { token } = await s.issue({ proId: PRO.id, profile: web })
      await s.open(token)
      const first = await s.pair(token, 'taste')
      await s.answer(token, 'taste', 'a')
      expect((await s.pair(token, 'taste'))!.axisKey).not.toBe(first!.axisKey)
      const back = await s.undo(token, 'taste')
      expect(back.cursor).toBe(0)
      expect((await s.pair(token, 'taste'))!.axisKey).toBe(first!.axisKey)
    })

    it('전 블록 확정 전에는 사양을 확정할 수 없다', async () => {
      const s = svc()
      const { token } = await s.issue({ proId: PRO.id, profile: web })
      await s.open(token)
      await expect(s.settle(token)).rejects.toThrow(/GATE_LOCKED/u)
    })
  })

  describe('gated — 리허설이 범위 앞을 막는다', () => {
    it('리허설을 통과해야 범위 조립이 열린다', async () => {
      const s = svc()
      const { token } = await s.issue({ proId: PRO.id, profile: photo })
      await s.open(token)
      for (let i = 0; i < 5; i++) await s.answer(token, 'taste', 'a')
      let view = await s.settleBlock(token, 'taste')

      expect(view.cursor).toBe('rehearsal')
      expect(view.blocks.find((b) => b.blockId === 'scope')?.state).toBe('LOCKED_OUT')

      view = await s.settleBlock(token, 'rehearsal')
      expect(view.cursor).toBe('scope')
      expect(view.amountUsd).toBe(420) // 촬영 240 + 보정 120 + 테스트컷 60
      expect(view.revisions).toBe(2)
    })
  })

  describe('저장소 계약', () => {
    it('토큰과 id 로 같은 세션이 나온다', async () => {
      const s = svc()
      const issued = await s.issue({ proId: PRO.id, profile: web })
      const byToken = await sessions.byToken(issued.token)
      const byId = await sessions.byId(issued.id)
      expect(byToken?.id).toBe(issued.id)
      expect(byId?.token).toBe(issued.token)
    })

    it('없는 토큰은 undefined', async () => {
      expect(await sessions.byToken('nope')).toBeUndefined()
    })

    it('프로파일 스냅샷이 왕복해도 컴파일 결과가 보존된다', async () => {
      const s = svc()
      const issued = await s.issue({ proId: PRO.id, profile: photo })
      const back = await sessions.byToken(issued.token)
      expect(back!.profile.slug).toBe('photo')
      expect(back!.profile.flow).toContain('rehearsal')
      expect(back!.profile.policy.pnr).toBe('blocking')
    })

    it('진행 상태가 왕복해도 남는다 — 새로고침 복원', async () => {
      const s = svc()
      const { token } = await s.issue({ proId: PRO.id, profile: web })
      await s.open(token)
      await s.answer(token, 'taste', 'a')
      await s.answer(token, 'taste', 'b')
      await s.setScope(token, { '4': true })

      const back = await sessions.byToken(token)
      expect(back!.choices['taste']).toEqual(['a', 'b'])
      expect(back!.scope).toEqual({ '4': true })
      expect(back!.state).toBe('IN_PROGRESS')
    })

    it('프리랜서별 목록이 발급 순서로 나온다', async () => {
      const rows = await sessions.listByPro(PRO.id)
      expect(rows.length).toBeGreaterThan(0)
      expect(rows.every((r) => r.proId === PRO.id)).toBe(true)
      expect(rows.every((r) => r.token.length > 0)).toBe(true)
    })
  })

  describe('산출물 — 프리랜서가 복사한다', () => {
    it('사양서와 오퍼 텍스트가 같은 사양을 말한다', async () => {
      const s = svc()
      const { token } = await s.issue({ proId: PRO.id, profile: web })
      await s.open(token)
      for (let i = 0; i < 6; i++) await s.answer(token, 'taste', 'a')
      await s.settleBlock(token, 'taste')
      await s.pick(token, 'structure', 0)
      await s.settleBlock(token, 'structure')
      await s.settleBlock(token, 'scope')
      const { spec } = await s.settle(token)

      for (const text of [renderSheet(spec), renderOfferText(spec)]) {
        expect(text).toContain(spec.no)
        expect(text).toContain('padding 32px')
        expect(text).toContain('380.00')
      }
    })
  })
})

describe('G-3 — 전송 계열 메서드가 존재하지 않는다', () => {
  it('SessionService 프로토타입에 send/publish/post 가 없다', () => {
    const names = Object.getOwnPropertyNames(SessionService.prototype)
    expect(names.filter((n) => /send|publish|post|submitTo|autoReply/iu.test(n))).toEqual([])
  })
})
