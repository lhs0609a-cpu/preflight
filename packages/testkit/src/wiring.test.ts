/**
 * 배선 통합 — 이번에 이은 것들이 **끝까지 도는지**를 본다.
 *
 * 단위 테스트가 통과해도 화면에 붙지 않으면 아무 일도 일어나지 않는다.
 * M1 에서 실제로 그랬다 — C-04 · C-08 · C-11 은 컴포넌트도 서비스도 테스트도
 * 있었지만 앱이 부르지 않아 도달 불가능했다.
 *
 * 그래서 여기서는 앱이 하는 순서 그대로 서비스를 부르고, 화면 단계까지
 * resolvePhase 로 확인한다. 두 저장소 모두에서 돈다.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  resolvePhase,
  shouldSettle,
  type CompiledProfile,
  type Side,
} from '@preflight/core'
import { SessionService } from '@preflight/session'
import { compileAllProfiles } from './profiles.ts'
import { STORE_ADAPTERS, type StoreBundle } from './stores.ts'

const profiles = compileAllProfiles()
/** 자료 블록이 있는 유형. A4 가 건너뛰던 바로 그 블록이다 */
const web = profiles.find((p) => p.slug === 'web')!

const PRO = 'pro-1'

interface Rig {
  readonly svc: SessionService
  readonly bundle: StoreBundle
}

async function rigFor(make: () => Promise<StoreBundle>): Promise<Rig> {
  const bundle = await make()
  await bundle.pros.put({
    id: PRO,
    email: 'a@b.co',
    displayName: 'A',
    locale: 'ko',
    timezone: 'Asia/Seoul',
    state: 'ACTIVE',
    billingVerified: true,
  })
  let n = 0
  const svc = new SessionService({
    store: bundle.sessions,
    pros: bundle.pros,
    ids: { token: () => `tok${++n}`, id: () => `id${n}` },
  })
  return { svc, bundle }
}

/** 앱의 maybeSettle 과 같은 규칙 — 코어 순수 함수 하나를 공유한다 */
async function maybeSettle(svc: SessionService, token: string): Promise<void> {
  if (shouldSettle(await svc.view(token))) await svc.settle(token)
}

/** C-02 → C-03 확정까지. 앱이 하는 순서 그대로 */
async function runTaste(
  svc: SessionService,
  token: string,
  profile: CompiledProfile,
  side: Side = 'a',
): Promise<string> {
  const block = profile.blocks.find((b) => b.config.kind === 'PAIRWISE')!
  const config = block.config
  if (config.kind !== 'PAIRWISE') throw new Error('unreachable')
  for (let i = 0; i < config.axes.length; i++) await svc.answer(token, block.id, side)
  await svc.settleBlock(token, block.id)
  await maybeSettle(svc, token)
  return block.id
}

async function runToScope(svc: SessionService, token: string): Promise<void> {
  await svc.open(token)
  await runTaste(svc, token, web)
  const structure = web.blocks.find((b) => b.config.kind === 'PICK_N')!
  await svc.pick(token, structure.id, 0)
  await svc.settleBlock(token, structure.id)
  await maybeSettle(svc, token)
  const scope = web.blocks.find(
    (b) => b.config.kind === 'CHECKLIST' && b.config.mode === 'scope',
  )!
  await svc.settleBlock(token, scope.id)
  await maybeSettle(svc, token)
}

/** C-08 확정. 선택 블록이지만 커서를 비우려면 넘겨야 한다 */
async function settleAssets(svc: SessionService, token: string): Promise<void> {
  const assets = web.blocks.find(
    (b) => b.config.kind === 'CHECKLIST' && b.config.mode === 'assets',
  )!
  await svc.settleBlock(token, assets.id)
  await maybeSettle(svc, token)
}

const phaseOf = (v: {
  settled: boolean
  pendingNegotiations: number
  cursor: string | null
  opened: boolean
}) =>
  resolvePhase({
    settled: v.settled,
    feedbackOpen: false,
    pendingNegotiations: v.pendingNegotiations,
    cursor: v.cursor,
    awaitingConfirm: false,
    opened: v.opened,
  })

for (const adapter of STORE_ADAPTERS) {
  describe(`배선 — ${adapter.name}`, () => {
    let rig: Rig

    beforeAll(async () => {
      rig = await rigFor(adapter.make)
    })
    afterAll(async () => {
      await rig.bundle.close()
    })

    // ── A4 · C-08 자료 체크 ──────────────────────────────────────────

    describe('C-08 자료 체크가 도달 가능하다 (A4)', () => {
      it('범위 확정 뒤에도 확정되지 않고 자료 블록이 열린다', async () => {
        const { token } = await rig.svc.issue({ proId: PRO, profile: web })
        await runToScope(rig.svc, token)

        const v = await rig.svc.view(token)
        const assets = web.blocks.find(
          (b) => b.config.kind === 'CHECKLIST' && b.config.mode === 'assets',
        )!
        // 전에는 여기서 canSettle 만 보고 곧장 확정해 이 블록을 통째로 건너뛰었다
        expect(v.canSettle).toBe(true)
        expect(v.settled).toBe(false)
        expect(v.cursor).toBe(assets.id)
        expect(phaseOf(v)).toBe('block')
      })

      it('자료를 표시하면 금액과 진행이 바뀐다', async () => {
        const { token } = await rig.svc.issue({ proId: PRO, profile: web })
        await runToScope(rig.svc, token)
        const before = await rig.svc.view(token)

        const assets = web.blocks.find(
          (b) => b.config.kind === 'CHECKLIST' && b.config.mode === 'assets',
        )!
        const config = assets.config
        if (config.kind !== 'CHECKLIST') throw new Error('unreachable')
        const paid = config.items.find((i) => i.fallbackAmountUsd !== undefined)!

        await rig.svc.setAssets(token, { [config.items[0]!.labelKey]: { provided: true } })
        await rig.svc.setAssets(token, { [paid.labelKey]: { fallbackTaken: true } })
        const after = await rig.svc.view(token)

        expect(after.assetsProvided).toBe(before.assetsProvided + 2)
        // 대행은 재촉이 아니라 계산 결과다 (04 §6)
        expect(after.amountUsd).toBeCloseTo(before.amountUsd + (paid.fallbackAmountUsd ?? 0), 2)
      })

      it('자료를 하나도 안 줘도 넘어간다 — 선택 블록이다', async () => {
        const { token } = await rig.svc.issue({ proId: PRO, profile: web })
        await runToScope(rig.svc, token)
        const assets = web.blocks.find(
          (b) => b.config.kind === 'CHECKLIST' && b.config.mode === 'assets',
        )!
        await rig.svc.settleBlock(token, assets.id)
        await maybeSettle(rig.svc, token)

        const v = await rig.svc.view(token)
        expect(v.settled).toBe(true)
        expect(phaseOf(v)).toBe('done')
      })
    })

    // ── C-04 역제안 · 04 §5.2 검토 관문 ──────────────────────────────

    describe('C-04 역제안과 검토 관문', () => {
      it('관문이 꺼져 있으면 클라이언트가 끝내는 즉시 확정된다 (기본)', async () => {
        const { token } = await rig.svc.issue({ proId: PRO, profile: web })
        await runToScope(rig.svc, token)
        const assets = web.blocks.find(
          (b) => b.config.kind === 'CHECKLIST' && b.config.mode === 'assets',
        )!
        await rig.svc.settleBlock(token, assets.id)
        await maybeSettle(rig.svc, token)
        expect((await rig.svc.view(token)).settled).toBe(true)
      })

      it('관문이 켜져 있으면 확정되지 않고 대기 화면이 뜬다', async () => {
        const { token } = await rig.svc.issue({ proId: PRO, profile: web, reviewGate: true })
        await runToScope(rig.svc, token)
        const assets = web.blocks.find(
          (b) => b.config.kind === 'CHECKLIST' && b.config.mode === 'assets',
        )!
        await rig.svc.settleBlock(token, assets.id)
        await maybeSettle(rig.svc, token)

        const v = await rig.svc.view(token)
        expect(v.canSettle).toBe(true)
        expect(v.settled).toBe(false)
        expect(v.cursor).toBeNull()
        expect(phaseOf(v)).toBe('waiting')
      })

      it('역제안 없이 통과시키면 확정된다', async () => {
        const { token } = await rig.svc.issue({ proId: PRO, profile: web, reviewGate: true })
        await runToScope(rig.svc, token)
        const assets = web.blocks.find(
          (b) => b.config.kind === 'CHECKLIST' && b.config.mode === 'assets',
        )!
        await rig.svc.settleBlock(token, assets.id)
        await rig.svc.passReview(token)
        expect((await rig.svc.view(token)).settled).toBe(true)
      })

      it('역제안을 보내면 클라이언트 화면이 C-04 로 바뀌고 확정이 막힌다', async () => {
        const { token } = await rig.svc.issue({ proId: PRO, profile: web, reviewGate: true })
        await runToScope(rig.svc, token)
        await settleAssets(rig.svc, token)
        const record = await rig.svc.record(token)
        const block = web.blocks.find((b) => b.config.kind === 'PAIRWISE')!
        const config = block.config
        if (config.kind !== 'PAIRWISE') throw new Error('unreachable')
        const axis = config.axes[0]!

        await rig.svc.propose(token, [
          {
            id: `${record.id}:n0`,
            axisKey: axis.nameKey,
            current: { labelKey: axis.a.labelKey, measure: axis.a.measure, value: axis.a.value },
            proposed: { labelKey: axis.b.labelKey, measure: axis.b.measure, value: axis.b.value },
            reasonFree: '가독성 때문에',
            response: null,
          },
        ])

        const v = await rig.svc.view(token)
        expect(v.pendingNegotiations).toBe(1)
        expect(v.canSettle).toBe(false)
        expect(phaseOf(v)).toBe('negotiate')
        await expect(rig.svc.passReview(token)).resolves.toBeDefined()
        expect((await rig.svc.view(token)).settled).toBe(false)
      })

      it('클라이언트가 응답하면 확정되고 책임 귀속이 남는다 (04 §5.3)', async () => {
        const { token } = await rig.svc.issue({ proId: PRO, profile: web, reviewGate: true })
        await runToScope(rig.svc, token)
        await settleAssets(rig.svc, token)
        const record = await rig.svc.record(token)
        const block = web.blocks.find((b) => b.config.kind === 'PAIRWISE')!
        const config = block.config
        if (config.kind !== 'PAIRWISE') throw new Error('unreachable')
        const axis = config.axes[0]!

        await rig.svc.propose(token, [
          {
            id: `${record.id}:n0`,
            axisKey: axis.nameKey,
            current: { labelKey: axis.a.labelKey, measure: axis.a.measure, value: axis.a.value },
            proposed: { labelKey: axis.b.labelKey, measure: axis.b.measure, value: axis.b.value },
            response: null,
          },
        ])
        const out = await rig.svc.respondNegotiation(token, `${record.id}:n0`, 'keep')
        // keep 이면 그 축의 성과는 프리랜서 책임에서 빠진다
        expect(out.specLine.owner).toBe('CLIENT')
        expect(out.remaining).toBe(0)

        await maybeSettle(rig.svc, token)
        const v = await rig.svc.view(token)
        expect(v.settled).toBe(true)
        expect(phaseOf(v)).toBe('done')
      })

      it('클라이언트에게 가는 형태에 근거가 없다 — 이 화면의 존재 이유다', async () => {
        const { token } = await rig.svc.issue({ proId: PRO, profile: web, reviewGate: true })
        await runToScope(rig.svc, token)
        const record = await rig.svc.record(token)
        const block = web.blocks.find((b) => b.config.kind === 'PAIRWISE')!
        const config = block.config
        if (config.kind !== 'PAIRWISE') throw new Error('unreachable')
        const axis = config.axes[0]!

        await rig.svc.propose(token, [
          {
            id: `${record.id}:n0`,
            axisKey: axis.nameKey,
            current: { labelKey: axis.a.labelKey, measure: axis.a.measure, value: axis.a.value },
            proposed: { labelKey: axis.b.labelKey, measure: axis.b.measure, value: axis.b.value },
            reasonKey: 'reason.readability',
            reasonFree: '본문이 너무 빽빽합니다',
            response: null,
          },
        ])

        const views = await rig.svc.negotiations(token)
        const json = JSON.stringify(views)
        expect(json).not.toContain('readability')
        expect(json).not.toContain('빽빽')
        for (const v of views) {
          expect(Object.keys(v).sort()).toEqual(
            ['axisKey', 'current', 'id', 'proposed', 'response'].sort(),
          )
        }
        // 근거는 프리랜서 쪽에는 남아 있어야 한다 (04 §5.3 의 "제안은 했다" 기록)
        expect(JSON.stringify((await rig.svc.record(token)).negotiations)).toContain('빽빽')
      })
    })

    // ── C-11 피드백 ─────────────────────────────────────────────────

    describe('C-11 피드백', () => {
      it('요청이 판정과 함께 남는다 — 판정만 하고 버리면 프리랜서가 볼 것이 없다', async () => {
        const { token } = await rig.svc.issue({ proId: PRO, profile: web })
        await runToScope(rig.svc, token)
        const assets = web.blocks.find(
          (b) => b.config.kind === 'CHECKLIST' && b.config.mode === 'assets',
        )!
        await rig.svc.settleBlock(token, assets.id)
        await maybeSettle(rig.svc, token)

        const verdict = await rig.svc.submitRequest(
          token,
          { basis: 'taste', changeRatio: 0.1, axesTouched: 1 },
          { axisKey: 'spacing', direction: 55, note: 'un poco más aire' },
        )
        expect(verdict.outcome.kind).toBe('counted')

        const r = await rig.svc.record(token)
        expect(r.requests).toHaveLength(1)
        expect(r.requests[0]!.note).toBe('un poco más aire')
        expect(r.requests[0]!.axisKey).toBe('spacing')
        expect(r.revisionsUsed).toBe(1)
      })

      it('슬라이더를 끝까지 밀면 방향 변경으로 자동 재분류된다 (04 §4.3)', async () => {
        const { token } = await rig.svc.issue({ proId: PRO, profile: web })
        await runToScope(rig.svc, token)
        const assets = web.blocks.find(
          (b) => b.config.kind === 'CHECKLIST' && b.config.mode === 'assets',
        )!
        await rig.svc.settleBlock(token, assets.id)
        await maybeSettle(rig.svc, token)

        // 화면이 묻는 건 방향 슬라이더뿐이다. changeRatio 는 거기서 파생된다.
        const direction = 100
        const verdict = await rig.svc.submitRequest(
          token,
          { basis: 'taste', changeRatio: Math.abs(direction - 50) / 50, axesTouched: 1 },
          { axisKey: 'spacing', direction, note: '' },
        )
        expect(verdict.reclassifiedFrom).toBe('taste')
        expect(verdict.outcome.kind).toBe('requote')
      })
    })

    // ── A2 · 재방문 ─────────────────────────────────────────────────

    it('확정된 링크를 다시 열어도 상태가 무너지지 않는다 (A2)', async () => {
      const { token } = await rig.svc.issue({ proId: PRO, profile: web })
      await runToScope(rig.svc, token)
      const assets = web.blocks.find(
        (b) => b.config.kind === 'CHECKLIST' && b.config.mode === 'assets',
      )!
      await rig.svc.settleBlock(token, assets.id)
      await maybeSettle(rig.svc, token)

      // open() 은 ISSUED 일 때만 전이한다. 확정된 세션은 그대로 통과해야 한다.
      const again = await rig.svc.open(token)
      expect(again.settled).toBe(true)
      expect(phaseOf(again)).toBe('done')
      // 사양서는 확정 시점 입력에서 결정적으로 재생성된다
      expect(await rig.svc.specOf(token)).not.toBeNull()
    })

    it('reviewGate 는 발급 시 정해지고 저장소를 왕복해도 유지된다', async () => {
      const a = await rig.svc.issue({ proId: PRO, profile: web, reviewGate: true })
      const b = await rig.svc.issue({ proId: PRO, profile: web })
      expect((await rig.svc.record(a.token)).reviewGate).toBe(true)
      expect((await rig.svc.record(b.token)).reviewGate).toBe(false)
    })
  })
}

describe('shouldSettle — 확정 관문', () => {
  const base = {
    settled: false,
    cursor: null,
    reviewPending: false,
    pendingNegotiations: 0,
    canSettle: true,
  }
  it('전부 통과하면 확정한다', () => expect(shouldSettle(base)).toBe(true))
  it('이미 확정됐으면 다시 하지 않는다', () =>
    expect(shouldSettle({ ...base, settled: true })).toBe(false))
  it('열린 블록이 남으면 안 한다 — A4 가 여기서 빠져 있었다', () =>
    expect(shouldSettle({ ...base, cursor: 'assets' })).toBe(false))
  it('아직 검토 전이면 안 한다', () =>
    expect(shouldSettle({ ...base, reviewPending: true })).toBe(false))
  it('검토가 끝났으면 관문이 켜져 있어도 확정한다 — 04 §5.2 4번', () =>
    expect(shouldSettle({ ...base, reviewPending: false })).toBe(true))
  it('미응답 역제안이 있으면 안 한다', () =>
    expect(shouldSettle({ ...base, pendingNegotiations: 1 })).toBe(false))
  it('필수 블록이 남으면 안 한다', () =>
    expect(shouldSettle({ ...base, canSettle: false })).toBe(false))
})
