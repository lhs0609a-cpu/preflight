/**
 * C-09 팀 대조 — FR-7 · 04 §5.3.
 *
 * 결정권자가 여럿인 계약에서 어느 축이 갈렸는지를 보여준다.
 *
 * 여기서 고정하는 것은 하나다 — **최종 사양은 주 클라이언트의 선택으로 간다.**
 * 대조는 정보 제공이고 시스템은 어느 쪽도 막지 않는다. 다수결이나 합의 강제를
 * 넣으면 이 제품이 지켜온 원칙이 깨지므로, 팀이 갈려도 확정이 되는 것과
 * 사양이 주 클라이언트 것인 것을 둘 다 못박는다.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { shouldSettle, type CompiledProfile, type Side } from '@preflight/core'
import { SessionService } from '@preflight/session'
import { compileAllProfiles } from './profiles.ts'
import { STORE_ADAPTERS, type StoreBundle } from './stores.ts'

const PRO = 'pro-t'
const web = compileAllProfiles().find((p) => p.slug === 'web')!
const roster = web.blocks.find((b) => b.config.kind === 'ROSTER')!
const taste = web.blocks.find((b) => b.config.kind === 'PAIRWISE')!
const axes = taste.config.kind === 'PAIRWISE' ? taste.config.axes.length : 0

async function maybeSettle(svc: SessionService, token: string): Promise<void> {
  if (shouldSettle(await svc.view(token))) await svc.settle(token)
}

/** 커서를 따라 끝까지. 블록 id 를 나열하지 않는다 */
async function drive(svc: SessionService, token: string, p: CompiledProfile, side: Side) {
  await svc.open(token)
  for (let guard = 0; guard < 24; guard++) {
    const v = await svc.view(token)
    if (v.cursor === null || v.settled) return
    const config = p.blocks.find((b) => b.id === v.cursor)!.config
    if (config.kind === 'PAIRWISE') {
      const done = (await svc.record(token)).choices[v.cursor]?.length ?? 0
      for (let i = done; i < config.axes.length; i++) await svc.answer(token, v.cursor, side)
    } else if (config.kind === 'PICK_N') {
      await svc.pick(token, v.cursor, 0)
    }
    await svc.settleBlock(token, v.cursor)
    await maybeSettle(svc, token)
  }
  throw new Error('끝나지 않았다')
}

for (const adapter of STORE_ADAPTERS) {
  describe(`C-09 팀 대조 — ${adapter.name}`, () => {
    let b: StoreBundle
    let svc: SessionService

    beforeAll(async () => {
      b = await adapter.make()
      await b.pros.put({
        id: PRO,
        email: 't@b.co',
        displayName: 'T',
        locale: 'ko',
        timezone: 'Asia/Seoul',
        state: 'ACTIVE',
        billingVerified: true,
      })
      let n = 0
      svc = new SessionService({
        store: b.sessions,
        pros: b.pros,
        ids: { token: () => `tt${++n}`, id: () => `ti${n}` },
      })
    })
    afterAll(async () => {
      await b.close()
    })

    it('프로파일에 ROSTER 블록이 있다', () => {
      expect(roster.config.kind).toBe('ROSTER')
      expect(axes).toBeGreaterThan(0)
    })

    it('팀원 링크를 만들면 그 토큰으로 세션을 찾는다', async () => {
      const { token } = await svc.issue({ proId: PRO, profile: web })
      const m = await svc.addMember(token)
      expect(m.url).toContain('/s/')

      const memberToken = m.url.split('/s/')[1]!
      const found = await svc.memberByToken(memberToken)
      expect(found?.memberId).toBe(m.id)
      // 주 클라이언트 토큰으로는 팀원이 조회되지 않는다
      expect(await svc.memberByToken(token)).toBeUndefined()
    })

    it('자리는 maxMembers 까지만 열린다 — 주 클라이언트가 한 자리를 쓴다', async () => {
      const { token } = await svc.issue({ proId: PRO, profile: web })
      const max = roster.config.kind === 'ROSTER' ? roster.config.maxMembers : 0
      for (let i = 0; i < max - 1; i++) await svc.addMember(token)
      await expect(svc.addMember(token)).rejects.toThrow(/ROSTER_FULL/u)
    })

    it('팀원의 선택이 주 클라이언트와 따로 저장된다', async () => {
      const { token } = await svc.issue({ proId: PRO, profile: web })
      const m = await svc.addMember(token)
      const mt = m.url.split('/s/')[1]!

      await svc.open(token)
      for (let i = 0; i < axes; i++) await svc.answer(token, taste.id, 'a')
      for (let i = 0; i < axes; i++) await svc.memberAnswer(mt, taste.id, 'b')

      const r = await svc.record(token)
      expect(r.choices[taste.id]).toEqual(Array(axes).fill('a'))
      expect(r.members[0]!.choices[taste.id]).toEqual(Array(axes).fill('b'))
    })

    it('팀이 전부 갈려도 확정된다 — 시스템은 어느 쪽도 막지 않는다 (04 §5.3)', async () => {
      const { token } = await svc.issue({ proId: PRO, profile: web })
      const m = await svc.addMember(token)
      const mt = m.url.split('/s/')[1]!

      await svc.open(token)
      for (let i = 0; i < axes; i++) await svc.memberAnswer(mt, taste.id, 'b')
      await drive(svc, token, web, 'a')

      const v = await svc.view(token)
      expect(v.settled).toBe(true)
    })

    it('최종 사양은 주 클라이언트의 선택이다 — 팀원 것이 섞이지 않는다', async () => {
      const { token } = await svc.issue({ proId: PRO, profile: web })
      const m = await svc.addMember(token)
      const mt = m.url.split('/s/')[1]!

      // 팀원은 전부 반대쪽을 골랐다
      await svc.open(token)
      for (let i = 0; i < axes; i++) await svc.memberAnswer(mt, taste.id, 'b')
      await drive(svc, token, web, 'a')

      const config = taste.config
      if (config.kind !== 'PAIRWISE') throw new Error('unreachable')
      const built = await svc.specOf(token)
      expect(built).not.toBeNull()

      // 사양의 축 값이 전부 a 쪽이어야 한다
      for (const axis of config.axes) {
        const line = built!.spec.lines.find((l) => l.key === axis.nameKey)!
        expect(line.measure).toBe(axis.a.measure)
      }
    })

    it('팀원 토큰으로는 확정할 수 없다 — 결정권자가 아니다', async () => {
      const { token } = await svc.issue({ proId: PRO, profile: web })
      const m = await svc.addMember(token)
      const mt = m.url.split('/s/')[1]!
      await expect(svc.record(mt)).rejects.toThrow(/UNAUTHORIZED/u)
    })

    it('확정된 뒤에는 자리를 더 열 수 없다', async () => {
      const { token } = await svc.issue({ proId: PRO, profile: web })
      await drive(svc, token, web, 'a')
      await expect(svc.addMember(token)).rejects.toThrow(/ALREADY_SETTLED/u)
    })
  })
}
