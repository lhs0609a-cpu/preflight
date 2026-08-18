/**
 * 클라이언트 한 명이 링크를 열고 사양을 확정하기까지 — 05 문서 전 구간.
 *
 * 이 흐름이 5분 안에 끝나야 하고(NFR-2.3), 완료율 60% 를 넘겨야 한다(07 §5.2).
 * 여기서 검증하는 것은 시간이 아니라 **막히는 지점이 없는가**이다.
 */
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { InMemorySessionStore, SessionService, type Clock, type Ids } from '@preflight/session'
import { renderOfferText, renderSheet, type Side } from '@preflight/core'
import { compileAllProfiles } from './profiles.ts'

const profiles = compileAllProfiles()
const web = profiles.find((p) => p.slug === 'web')!
const photo = profiles.find((p) => p.slug === 'photo')!

/** 결정적 시계·난수. 사양서 해시를 검증하려면 필수다. */
function deterministic(): { clock: Clock; ids: Ids } {
  let n = 0
  return {
    clock: { now: () => '2026-09-02T00:00:00.000Z' },
    ids: {
      token: () => `tok${String(++n).padStart(6, '0')}`,
      id: () => `id${String(n).padStart(6, '0')}`,
      seq: () => 142,
    },
  }
}

const svc = () => new SessionService({ store: new InMemorySessionStore(), ...deterministic() })

describe('링크 발급 — 05 §5 · FR-3', () => {
  it('영문 안내문과 링크를 만든다. 전송 기능은 없다', () => {
    const r = svc().issue({ profile: web, clientLabel: 'Acme Corp', marketplace: 'upwork' })
    expect(r.no).toBe('PF-2609-0142')
    expect(r.clientUrl).toContain('/s/tok000001')
    expect(r.shareText).toContain(r.clientUrl)
    expect(r.shareText).toContain('5 minutes')
    expect(r.state).toBe('ISSUED')
  })

  it('G-3 — 서비스에 전송·게시 계열 메서드가 존재하지 않는다', () => {
    const names = Object.getOwnPropertyNames(SessionService.prototype)
    const forbidden = names.filter((n) => /send|publish|post|submitTo|autoReply/iu.test(n))
    expect(forbidden).toEqual([])
  })
})

describe('클라이언트 전 구간 — web 프로파일', () => {
  it('열람 → 카드 → 구조 → 범위 → 확정', () => {
    const s = svc()
    const issued = s.issue({ profile: web })
    const token = issued.token

    // 열람
    let view = s.open(token)
    expect(view.cursor).toBe('taste')
    expect(view.locked).toBe(0)
    expect(view.total).toBe(8) // 축 6 + 구조 1 + 범위 1

    // 취향 카드 6쌍
    const total = 6
    for (let i = 0; i < total; i++) {
      const pair = s.pair(token, 'taste')
      expect(pair, `cursor ${i}`).not.toBeNull()
      const r = s.answer(token, 'taste', (i % 2 === 0 ? 'a' : 'b') as Side)
      expect(r.cursor).toBe(i + 1)
      expect(r.done).toBe(i === total - 1)
    }
    expect(s.pair(token, 'taste')).toBeNull()
    view = s.settleBlock(token, 'taste')
    expect(view.locked).toBe(6)

    // 구조 선택
    expect(view.cursor).toBe('structure')
    s.pick(token, 'structure', 1)
    view = s.settleBlock(token, 'structure')
    expect(view.locked).toBe(7)

    // 범위 조립 — 기본 선택 그대로면 06 C-07 의 $380 · 6w
    expect(view.cursor).toBe('scope')
    expect(view.amountUsd).toBe(380)
    expect(view.weeks).toBe(6)
    view = s.setScope(token, { '3': true }) // photos 추가 $60
    expect(view.amountUsd).toBe(440)
    view = s.settleBlock(token, 'scope')

    expect(view.locked).toBe(8)
    expect(view.canSettle).toBe(true)

    // 확정
    const { spec, payload } = s.settle(token)
    expect(spec.no).toBe('PF-2609-0142')
    expect(spec.amountUsd).toBe(440)
    expect(spec.lines).toHaveLength(8) // 축 6 + 구조 1 + 범위 1
    expect(spec.lines[0]!.measure).toBe('padding 32px')
    expect(createHash('sha256').update(payload).digest('hex')).toHaveLength(64)
  })

  it('순서를 건너뛸 수 없다', () => {
    const s = svc()
    const { token } = s.issue({ profile: web })
    s.open(token)
    expect(() => s.pick(token, 'structure', 0)).toThrow(/GATE_LOCKED/u)
    expect(() => s.settleBlock(token, 'scope')).toThrow(/GATE_LOCKED/u)
  })

  it('카드를 다 넘기기 전에는 블록을 확정할 수 없다', () => {
    const s = svc()
    const { token } = s.issue({ profile: web })
    s.open(token)
    s.answer(token, 'taste', 'a')
    expect(() => s.settleBlock(token, 'taste')).toThrow(/BLOCK_INCOMPLETE/u)
  })

  it('뒤로 가면 커서가 돌아오고 같은 축이 다시 나온다', () => {
    const s = svc()
    const { token } = s.issue({ profile: web })
    s.open(token)
    const first = s.pair(token, 'taste')!
    s.answer(token, 'taste', 'a')
    expect(s.pair(token, 'taste')!.axisKey).not.toBe(first.axisKey)
    const back = s.undo(token, 'taste')
    expect(back.cursor).toBe(0)
    expect(s.pair(token, 'taste')!.axisKey).toBe(first.axisKey)
  })

  it('전 블록 확정 전에는 사양을 확정할 수 없다', () => {
    const s = svc()
    const { token } = s.issue({ profile: web })
    s.open(token)
    expect(() => s.settle(token)).toThrow(/GATE_LOCKED/u)
  })

  it('같은 선택이면 같은 해시다 — 세션이 달라도', () => {
    const run = () => {
      const s = svc()
      const { token } = s.issue({ profile: web })
      s.open(token)
      for (let i = 0; i < 6; i++) s.answer(token, 'taste', 'a')
      s.settleBlock(token, 'taste')
      s.pick(token, 'structure', 0)
      s.settleBlock(token, 'structure')
      s.settleBlock(token, 'scope')
      return s.settle(token).payload
    }
    expect(createHash('sha256').update(run()).digest('hex')).toBe(
      createHash('sha256').update(run()).digest('hex'),
    )
  })
})

describe('gated 프로파일 — 리허설이 범위 앞을 막는다', () => {
  it('리허설을 통과해야 범위 조립이 열린다', () => {
    const s = svc()
    const { token } = s.issue({ profile: photo })
    s.open(token)
    for (let i = 0; i < 5; i++) s.answer(token, 'taste', 'a')
    let view = s.settleBlock(token, 'taste')

    expect(view.cursor).toBe('rehearsal')
    expect(view.blocks.find((b) => b.blockId === 'scope')?.state).toBe('LOCKED_OUT')

    view = s.settleBlock(token, 'rehearsal')
    expect(view.cursor).toBe('scope')
    // 촬영 240 + 보정 120 + 테스트컷 60
    expect(view.amountUsd).toBe(420)
    expect(view.revisions).toBe(2)
  })
})

describe('산출물 — 프리랜서가 복사한다', () => {
  it('사양서와 오퍼 텍스트가 같은 사양을 말한다', () => {
    const s = svc()
    const { token } = s.issue({ profile: web })
    s.open(token)
    for (let i = 0; i < 6; i++) s.answer(token, 'taste', 'a')
    s.settleBlock(token, 'taste')
    s.pick(token, 'structure', 0)
    s.settleBlock(token, 'structure')
    s.settleBlock(token, 'scope')
    const { spec } = s.settle(token)

    const sheet = renderSheet(spec)
    const offer = renderOfferText(spec)
    for (const text of [sheet, offer]) {
      expect(text).toContain('PF-2609-0142')
      expect(text).toContain('padding 32px')
      expect(text).toContain('380.00')
    }
  })
})
