/**
 * M1 잔여 기능 — 조율 · 피드백 · 온보딩 · 내보내기.
 */
import { describe, expect, it } from 'vitest'
import {
  LOCALES,
  renderSheet,
  textToPdf,
  toAscii,
  type NegotiationProposal,
} from '@preflight/core'
import { InMemoryProStore, InMemorySessionStore, ProService, SessionService } from '@preflight/session'
import { compileAllProfiles } from './profiles.ts'

const web = compileAllProfiles().find((p) => p.slug === 'web')!

function setup() {
  const pros = new InMemoryProStore()
  let n = 0
  const service = new SessionService({
    store: new InMemorySessionStore(),
    pros,
    clock: { now: () => '2026-09-02T00:00:00.000Z' },
    ids: { token: () => `t${++n}`, id: () => `i${n}` },
  })
  const proSvc = new ProService(pros, () => `pro${++n}`)
  return { service, proSvc, pros }
}

// ── 온보딩 (P-01 · FR-1) ────────────────────────────────────────────────

describe('프리랜서 온보딩', () => {
  it('가입 직후에는 링크를 발급할 수 없다 — 빌링키가 먼저다', async () => {
    const { service, proSvc } = setup()
    const pro = await proSvc.signup({
      email: 'a@b.com',
      displayName: '홍길동',
      locale: 'ko',
      timezone: 'Asia/Seoul',
    })
    expect(pro.billingVerified).toBe(false)
    await expect(service.issue({ proId: pro.id, profile: web })).rejects.toThrow(/BILLING_REQUIRED/u)

    await proSvc.registerBilling(pro.id, { provider: 'toss', billingKey: 'bk_live_x1' })
    const issued = await service.issue({ proId: pro.id, profile: web })
    expect(issued.no).toMatch(/^PF-/u)
  })

  it('카드 번호처럼 생긴 값은 빌링키로 받지 않는다 (NFR-5.4)', async () => {
    const { proSvc } = setup()
    const pro = await proSvc.signup({
      email: 'c@d.com',
      displayName: 'X',
      locale: 'en',
      timezone: 'UTC',
    })
    await expect(
      proSvc.registerBilling(pro.id, { provider: 'toss', billingKey: '4242 4242 4242 4242' }),
    ).rejects.toThrow(/LOOKS_LIKE_CARD_NUMBER/u)
  })

  it('지원하지 않는 로케일·타임존·이메일은 거부', async () => {
    const { proSvc } = setup()
    const base = { email: 'e@f.com', displayName: 'X', locale: 'ko', timezone: 'Asia/Seoul' }
    await expect(proSvc.signup({ ...base, email: 'nope' })).rejects.toThrow(/EMAIL_INVALID/u)
    // 목록에서 파생한다. 'fr' 을 박아뒀더니 프랑스어를 지원하는 순간 깨졌다 —
    // 로케일이 늘 때마다 테스트를 고쳐야 하면 그 테스트는 오래 못 간다.
    const unsupported = ['zz', 'xx', 'qq'].find((x) => !(LOCALES as readonly string[]).includes(x))!
    await expect(proSvc.signup({ ...base, locale: unsupported })).rejects.toThrow(
      /LOCALE_UNSUPPORTED/u,
    )
    await expect(proSvc.signup({ ...base, timezone: 'Mars/Olympus' })).rejects.toThrow(/TIMEZONE_INVALID/u)
  })

  it('같은 이메일로 두 번 가입할 수 없다', async () => {
    const { proSvc } = setup()
    const base = { email: 'g@h.com', displayName: 'X', locale: 'ko', timezone: 'Asia/Seoul' }
    await proSvc.signup(base)
    await expect(proSvc.signup(base)).rejects.toThrow(/EMAIL_TAKEN/u)
  })

  it('G-2 — 마켓플레이스 자격증명을 받는 메서드가 없다', () => {
    const names = Object.getOwnPropertyNames(ProService.prototype)
    expect(names.filter((n) => /password|credential|login|marketplaceAuth/iu.test(n))).toEqual([])
  })
})

// ── 조율 (C-04 · 04 §5) ─────────────────────────────────────────────────

describe('역제안', () => {
  async function issued() {
    const { service, proSvc } = setup()
    const pro = await proSvc.signup({
      email: 'n@n.com',
      displayName: 'N',
      locale: 'ko',
      timezone: 'Asia/Seoul',
    })
    await proSvc.registerBilling(pro.id, { provider: 'toss', billingKey: 'bk1' })
    const { token } = await service.issue({ proId: pro.id, profile: web })
    await service.open(token)
    for (let i = 0; i < 6; i++) await service.answer(token, 'taste', 'a')
    await service.settleBlock(token, 'taste')
    return { service, token }
  }

  const proposal = (): NegotiationProposal => ({
    id: 'n1',
    axisKey: 'density',
    current: { labelKey: 'low', measure: '2 blocks', value: 2 },
    proposed: { labelKey: 'high', measure: '6 blocks', value: 6 },
    reasonKey: 'seo_visibility',
    reasonFree: '검색 노출 때문에 밀도를 올리는 편이 낫습니다',
    response: null,
  })

  it('클라이언트 뷰에 근거가 내려가지 않는다 — 04 §5.1', async () => {
    const { service, token } = await issued()
    await service.propose(token, [proposal()])
    const view = await service.negotiations(token)
    const serialized = JSON.stringify(view)

    expect(view).toHaveLength(1)
    expect(serialized).not.toContain('seo_visibility')
    expect(serialized).not.toContain('검색 노출')
    expect(view[0]!.current.measure).toBe('2 blocks')
    expect(view[0]!.proposed.measure).toBe('6 blocks')
  })

  it('미응답 역제안이 있으면 사양을 확정할 수 없다', async () => {
    const { service, token } = await issued()
    await service.propose(token, [proposal()])
    await service.pick(token, 'structure', 0)
    await service.settleBlock(token, 'structure')
    await service.settleBlock(token, 'scope')
    await expect(service.settle(token)).rejects.toThrow(/NEGOTIATION_PENDING/u)
  })

  it('keep 을 고르면 그 축의 책임이 클라이언트로 기록된다 — 04 §5.3', async () => {
    const { service, token } = await issued()
    await service.propose(token, [proposal()])
    const out = await service.respondNegotiation(token, 'n1', 'keep')
    expect(out.specLine).toEqual({
      key: 'density',
      value: 'low',
      measure: '2 blocks',
      owner: 'CLIENT',
    })
    expect(out.remaining).toBe(0)

    await service.pick(token, 'structure', 0)
    await service.settleBlock(token, 'structure')
    await service.settleBlock(token, 'scope')
    const { spec } = await service.settle(token)
    expect(spec.lines.find((l) => l.key === 'density')?.owner).toBe('CLIENT')
  })

  it('accept 를 고르면 프리랜서 책임으로 바뀐다', async () => {
    const { service, token } = await issued()
    await service.propose(token, [proposal()])
    const out = await service.respondNegotiation(token, 'n1', 'accept')
    expect(out.specLine).toMatchObject({ value: 'high', measure: '6 blocks', owner: 'PRO' })
  })

  it('같은 축에 두 번 제안할 수 없다 (08 §3.2)', async () => {
    const { service, token } = await issued()
    await expect(
      service.propose(token, [proposal(), { ...proposal(), id: 'n2' }]),
    ).rejects.toThrow(/DUPLICATE_AXIS_PROPOSAL/u)
  })

  it('이미 응답한 제안에는 다시 답할 수 없다', async () => {
    const { service, token } = await issued()
    await service.propose(token, [proposal()])
    await service.respondNegotiation(token, 'n1', 'keep')
    await expect(service.respondNegotiation(token, 'n1', 'accept')).rejects.toThrow(
      /ALREADY_ANSWERED/u,
    )
  })
})

// ── 내보내기 (FR-8.3) ───────────────────────────────────────────────────

describe('사양서 PDF', () => {
  async function settledSpec() {
    const { service, proSvc } = setup()
    const pro = await proSvc.signup({
      email: 'p@p.com',
      displayName: 'P',
      locale: 'ko',
      timezone: 'Asia/Seoul',
    })
    await proSvc.registerBilling(pro.id, { provider: 'toss', billingKey: 'bk1' })
    const { token } = await service.issue({ proId: pro.id, profile: web })
    await service.open(token)
    for (let i = 0; i < 6; i++) await service.answer(token, 'taste', 'a')
    await service.settleBlock(token, 'taste')
    await service.pick(token, 'structure', 0)
    await service.settleBlock(token, 'structure')
    await service.settleBlock(token, 'scope')
    return (await service.settle(token)).spec
  }

  it('PDF 바이트를 만든다', async () => {
    const spec = await settledSpec()
    const bytes = textToPdf(renderSheet(spec), { title: spec.no })
    const text = new TextDecoder().decode(bytes)
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true)
    expect(text).toContain('padding 32px')
    expect(text).toContain('/BaseFont/Courier')
  })

  it('같은 사양이면 같은 바이트다 — 해시와 같은 이유로 결정적이어야 한다', async () => {
    const spec = await settledSpec()
    const a = textToPdf(renderSheet(spec))
    const b = textToPdf(renderSheet(spec))
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true)
  })

  it('Courier 가 못 그리는 문자를 ASCII 로 옮긴다', () => {
    expect(toAscii('─── · → ×')).toBe('--- - -> x')
    expect(toAscii('여백')).toBe('??')
  })

  it('언어 중립 사양서는 손실 없이 들어간다', async () => {
    const spec = await settledSpec()
    const sheet = renderSheet(spec)
    expect(toAscii(sheet)).not.toContain('?')
  })
})
