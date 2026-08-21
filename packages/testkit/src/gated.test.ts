/**
 * gated 유형(촬영 · 인쇄)이 끝까지 도는가 — 04 §3 · C-12.
 *
 * 컴파일이 REHEARSAL 블록을 흐름에 꽂는데(12 §5.2) 화면에 그 분기가 없던 동안,
 * photo · print 는 취향 카드 다음이 **빈 화면**이었다. 4개 유형 중 2개가 못
 * 쓰는 상태였고, web 만 보고 있으면 드러나지 않는다.
 *
 * 그래서 여기서는 gated 유형을 **데이터에서 골라** 전부 돌린다. 슬러그를
 * 나열하지 않는다 — 새 gated 유형이 생기면 저절로 검사 대상이 된다.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { shouldSettle, type CompiledProfile, type Side } from '@preflight/core'
import { SessionService } from '@preflight/session'
import { compileAllProfiles } from './profiles.ts'
import { STORE_ADAPTERS, type StoreBundle } from './stores.ts'

const PRO = 'pro-g'
const gated = compileAllProfiles().filter((p) => p.policy.pnr === 'blocking')

async function maybeSettle(svc: SessionService, token: string): Promise<void> {
  if (shouldSettle(await svc.view(token))) await svc.settle(token)
}

/** 앱이 하는 순서 그대로. 커서를 따라가며 블록 종류별로 처리한다 */
async function drive(
  svc: SessionService,
  token: string,
  profile: CompiledProfile,
  seen: string[],
): Promise<void> {
  await svc.open(token)
  for (let guard = 0; guard < 24; guard++) {
    const v = await svc.view(token)
    if (v.cursor === null || v.settled) return
    seen.push(v.cursor)

    const config = profile.blocks.find((b) => b.id === v.cursor)!.config
    if (config.kind === 'PAIRWISE') {
      for (let i = 0; i < config.axes.length; i++) {
        await svc.answer(token, v.cursor, 'a' as Side)
      }
    } else if (config.kind === 'PICK_N') {
      await svc.pick(token, v.cursor, 0)
    }

    await svc.settleBlock(token, v.cursor)
    // C-12 — 리허설을 확정한 직후에 되돌림 한계점을 통과시킨다 (04 §3.3)
    if (config.kind === 'REHEARSAL') await svc.passPnr(token)
    await maybeSettle(svc, token)
  }
  throw new Error('끝나지 않았다')
}

describe('gated 유형', () => {
  it('검사할 gated 프로파일이 있다', () => {
    expect(gated.length).toBeGreaterThan(0)
  })

  for (const adapter of STORE_ADAPTERS) {
    for (const profile of gated) {
      describe(`${profile.slug} — ${adapter.name}`, () => {
        let b: StoreBundle
        let svc: SessionService

        beforeAll(async () => {
          b = await adapter.make()
          await b.pros.put({
            id: PRO,
            email: `g-${profile.slug}@b.co`,
            displayName: 'G',
            locale: 'ko',
            timezone: 'Asia/Seoul',
            state: 'ACTIVE',
            billingVerified: true,
          })
          let n = 0
          svc = new SessionService({
            store: b.sessions,
            pros: b.pros,
            ids: { token: () => `g${++n}`, id: () => `gi${n}` },
          })
        })
        afterAll(async () => {
          await b.close()
        })

        it('리허설 블록이 흐름 안에 있다 — 화면이 없으면 여기서 막힌다', () => {
          expect(profile.flow).toContain('rehearsal')
        })

        it('끝까지 돌아 확정된다', async () => {
          const { token } = await svc.issue({ proId: PRO, profile })
          const seen: string[] = []
          await drive(svc, token, profile, seen)

          const v = await svc.view(token)
          expect(v.settled).toBe(true)
          // 리허설을 실제로 지나왔어야 한다. 건너뛰었다면 흐름이 깨진 것이다
          expect(seen).toContain('rehearsal')
          expect(await svc.specOf(token)).not.toBeNull()
        })

        it('리허설 전에는 되돌림 한계점을 넘을 수 없다 (04 §3.3)', async () => {
          const { token } = await svc.issue({ proId: PRO, profile })
          await svc.open(token)
          await expect(svc.passPnr(token)).rejects.toThrow(/PNR_BLOCKED/u)
        })

        it('통과 시각이 기록된다 — 알렸다는 증거가 남아야 한다', async () => {
          const { token } = await svc.issue({ proId: PRO, profile })
          await drive(svc, token, profile, [])
          expect((await svc.record(token)).pnrPassedAt).not.toBeNull()
        })
      })
    }
  }
})
