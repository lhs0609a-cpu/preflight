/**
 * 게이트 · 금액 · 사양서를 **실제 프로파일**로 검증한다.
 *
 * 기준값은 내가 정한 것이 아니라 05 §7 · 06 C-07 · 02 §7 에 적힌 숫자다.
 * 문서와 코드가 어긋나면 여기서 터진다.
 */
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  clientBlockViews,
  compileSpec,
  evaluateAssets,
  evaluateGate,
  evaluateScope,
  formatSessionNo,
  linesFromChoices,
  renderOfferText,
  renderSheet,
  serializedPairAt,
  specPayload,
  totalsOf,
  type BlockOutput,
  type CompiledProfile,
  type Side,
} from '@preflight/core'
import { compileAllProfiles, loadLabelBundle } from './profiles.ts'

const profiles = compileAllProfiles()
const bySlug = new Map(profiles.map((p) => [p.slug, p]))
const web = bySlug.get('web')!
const photo = bySlug.get('photo')!

const configOf = (p: CompiledProfile, id: string) => p.blocks.find((b) => b.id === id)!.config

const sha256 = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex')

describe('게이트 — 04 §2 · FR-4.2', () => {
  it('시작하면 첫 블록만 열려 있다', () => {
    const gate = evaluateGate(web, { settled: new Set() })
    expect(gate.cursor).toBe('taste')
    expect(gate.states.get('taste')).toBe('OPEN')
    expect(gate.states.get('structure')).toBe('LOCKED_OUT')
    expect(gate.states.get('scope')).toBe('LOCKED_OUT')
  })

  it('선행 블록을 확정해야 다음이 열린다', () => {
    const gate = evaluateGate(web, { settled: new Set(['taste']) })
    expect(gate.states.get('taste')).toBe('SETTLED')
    expect(gate.states.get('structure')).toBe('OPEN')
    expect(gate.states.get('scope')).toBe('LOCKED_OUT')
  })

  it('역제안 검토 중이면 뒤가 열리지 않는다', () => {
    const gate = evaluateGate(web, { settled: new Set(), submitted: new Set(['taste']) })
    expect(gate.states.get('taste')).toBe('SUBMITTED')
    expect(gate.states.get('structure')).toBe('LOCKED_OUT')
    expect(gate.cursor).toBeNull()
  })

  it('필수 블록이 전부 확정되고 역제안이 없어야 확정 가능', () => {
    const required = web.blocks.filter((b) => b.required).map((b) => b.id)
    expect(evaluateGate(web, { settled: new Set(required) }).canSettle).toBe(true)
    expect(
      evaluateGate(web, { settled: new Set(required), pendingNegotiations: 1 }).canSettle,
    ).toBe(false)
  })

  it('선택 블록은 뒤를 막지 않는다', () => {
    // web 의 assets 는 required=false 이고 마지막이다. 앞이 다 확정되면 열린다.
    const gate = evaluateGate(web, { settled: new Set(['taste', 'structure', 'scope']) })
    expect(gate.states.get('assets')).toBe('OPEN')
    expect(gate.canSettle).toBe(true)
  })
})

describe('게이트 — gated 프로파일의 리허설 (04 §3.3)', () => {
  it('리허설 전에는 PNR 진입이 불가하다', () => {
    expect(evaluateGate(photo, { settled: new Set(['taste']) }).pnrAllowed).toBe(false)
    expect(
      evaluateGate(photo, { settled: new Set(['taste', 'rehearsal']) }).pnrAllowed,
    ).toBe(true)
  })

  it('cheap 프로파일은 PNR 개념이 없으므로 항상 허용', () => {
    expect(evaluateGate(web, { settled: new Set() }).pnrAllowed).toBe(true)
  })

  it('리허설은 범위 조립 앞을 막는다 — 금액 확정보다 먼저 실물을 본다', () => {
    const gate = evaluateGate(photo, { settled: new Set(['taste']) })
    expect(gate.states.get('rehearsal')).toBe('OPEN')
    expect(gate.states.get('scope')).toBe('LOCKED_OUT')
  })
})

describe('클라이언트 뷰 — 05 §5', () => {
  it('아이콘 키와 상태만 내려간다. 문장이 없다', () => {
    const views = clientBlockViews(web, evaluateGate(web, { settled: new Set() }))
    expect(views.map((v) => v.blockId)).toEqual(web.flow)
    for (const v of views) {
      expect(Object.keys(v).sort()).toEqual(['blockId', 'icon', 'state', 'type'])
      expect(v.icon).toMatch(/^[a-z][a-z0-9-]*$/u)
    }
  })
})

describe('PAIRWISE 진행 — 05 §6', () => {
  const taste = configOf(web, 'taste')

  it('서버가 쌍을 만들고, 두 values 는 축 필드 하나만 다르다', () => {
    const p = serializedPairAt(taste, 2)!
    expect(p.axisKey).toBe('type')
    expect(p.renderer).toBe('web')
    const [a, b] = p.pair
    const diff = Object.keys(a!.values).filter((k) => a!.values[k] !== b!.values[k])
    expect(diff).toEqual(['sf'])
  })

  it('커서가 끝나면 null', () => {
    expect(serializedPairAt(taste, 6)).toBeNull()
  })

  it('선택이 곧바로 수치가 된다 (설계 헌법 5)', () => {
    const choices: Side[] = ['a', 'a', 'a', 'a', 'a', 'a']
    const lines = linesFromChoices(taste, choices)
    expect(lines).toHaveLength(6)
    expect(lines[0]).toEqual({
      key: 'spacing',
      value: 'wide',
      measure: 'padding 32px',
      owner: 'CLIENT',
    })
    expect(lines.map((l) => l.measure)).toContain('#7E8F86 · 11%')
  })

  it('선택 개수가 축 개수와 다르면 거부', () => {
    expect(() => linesFromChoices(taste, ['a'])).toThrow(/CHOICES_LENGTH_MISMATCH/u)
  })
})

describe('범위·자료 계산 — 06 C-07 · 05 §7 의 숫자', () => {
  it('main + mobile + booking 기본 선택 → $380 · 6w', () => {
    const r = evaluateScope(configOf(web, 'scope'))
    expect(r.amountUsd).toBe(380)
    expect(r.weeks).toBe(6)
    expect(r.selected).toBe(3)
    expect(r.total).toBe(6)
  })

  it('체크를 바꾸면 합계가 즉시 따라온다', () => {
    const r = evaluateScope(configOf(web, 'scope'), { '0': true, '1': false, '2': false })
    expect(r.amountUsd).toBe(180)
    expect(r.weeks).toBe(4)
  })

  it('자료 대행을 고르면 금액이 붙는다 — photos +$60', () => {
    const r = evaluateAssets(configOf(web, 'assets'), {
      'asset.photos': { fallbackTaken: true },
    })
    expect(r.extraUsd).toBe(60)
  })

  it('blocks_start 자료가 없으면 납기가 기산되지 않는다 (04 §6)', () => {
    const cfg = configOf(web, 'assets')
    expect(evaluateAssets(cfg).startBlocked).toBe(true)
    expect(evaluateAssets(cfg, { 'asset.logo': { provided: true } }).startBlocked).toBe(false)
  })

  it('지연 일수는 재촉이 아니라 계산 결과다', () => {
    const r = evaluateAssets(configOf(web, 'assets'), { 'asset.logo': { daysWaiting: 3 } })
    expect(r.delayedDays).toBe(3)
  })

  it('세션 합계 — 범위 $380 + photos 대행 $60 = $440 (05 §7)', () => {
    const t = totalsOf(web, { assets: { 'asset.photos': { fallbackTaken: true } } })
    expect(t.amountUsd).toBe(440)
    expect(t.weeks).toBe(6)
    expect(t.revisions).toBe(3)
  })

  it('gated 는 리허설 금액이 합계에 자동으로 들어간다', () => {
    const t = totalsOf(photo, {})
    // shoot 240 + retouch 120 (기본 선택) + test-shot 60
    expect(t.rehearsalUsd).toBe(60)
    expect(t.amountUsd).toBe(420)
    expect(t.revisions).toBe(2)
  })
})

describe('사양서 — 02 §7 · 03 §2.8', () => {
  const taste = configOf(web, 'taste')
  const outputs: BlockOutput[] = [
    {
      blockId: 'scope',
      lines: [{ key: 'focus', value: 'image', measure: '4 items', owner: 'CLIENT' }],
      lockedAt: null,
      amountDeltaUsd: 380,
      daysDelta: 0,
    },
    {
      blockId: 'taste',
      lines: linesFromChoices(taste, ['a', 'a', 'a', 'a', 'a', 'a']),
      lockedAt: null,
      amountDeltaUsd: 0,
      daysDelta: 0,
    },
  ]
  const spec = compileSpec(web, {
    no: 'PF-2609-0142',
    outputs,
    amountUsd: 480,
    weeks: 2,
    revisions: 3,
    lockedAt: '2026-09-02T00:00:00.000Z',
  })

  it('출력 순서와 무관하게 flow 순서로 정렬된다', () => {
    expect(spec.lines[0]!.key).toBe('spacing')
    expect(spec.lines.at(-1)!.measure).toBe('4 items')
  })

  it('같은 사양이면 같은 해시다', () => {
    const reordered = compileSpec(web, {
      no: 'PF-2609-0142',
      outputs: [...outputs].reverse(),
      amountUsd: 480,
      weeks: 2,
      revisions: 3,
      lockedAt: '2026-09-02T00:00:00.000Z',
    })
    expect(sha256(specPayload(reordered))).toBe(sha256(specPayload(spec)))
  })

  it('한 글자만 달라도 해시가 달라진다', () => {
    const other = compileSpec(web, {
      no: 'PF-2609-0142',
      outputs,
      amountUsd: 480.01,
      weeks: 2,
      revisions: 3,
      lockedAt: '2026-09-02T00:00:00.000Z',
    })
    expect(sha256(specPayload(other))).not.toBe(sha256(specPayload(spec)))
  })

  it('금액은 소수점 2자리로 고정된다 — 부동소수가 해시에 섞이면 증거가 무너진다', () => {
    expect(specPayload(spec)).toContain('"amountUsd":"480.00"')
  })

  it('flow 에 없는 블록 출력은 거부', () => {
    expect(() =>
      compileSpec(web, {
        no: 'X',
        outputs: [{ blockId: 'ghost', lines: [], lockedAt: null, amountDeltaUsd: 0, daysDelta: 0 }],
        amountUsd: 0,
        weeks: 0,
        revisions: 0,
        lockedAt: '2026-09-02T00:00:00.000Z',
      }),
    ).toThrow(/OUTPUT_BLOCK_NOT_IN_FLOW/u)
  })

  it('언어 중립 사양서는 measure 를 그대로 싣는다', () => {
    const sheet = renderSheet(spec)
    expect(sheet).toContain('PREFLIGHT SPEC · PF-2609-0142')
    expect(sheet).toContain('padding 32px')
    expect(sheet).toContain('USD 480.00')
    expect(sheet).toContain('Locked 2026-09-02')
  })

  it('프리랜서 화면은 라벨만 병기하고 measure 는 번역하지 않는다 (FR-8.6)', () => {
    const sheet = renderSheet(spec, { dict: loadLabelBundle().ko })
    expect(sheet).toContain('Spacing / 여백')
    expect(sheet).toContain('padding 32px')
    expect(sheet).not.toContain('여백 32')
  })

  it('오퍼 텍스트는 사양을 옮길 뿐 새 약속을 만들지 않는다', () => {
    const offer = renderOfferText(spec)
    expect(offer).toContain('PF-2609-0142')
    expect(offer).toContain('Spacing padding 32px')
    expect(offer).toContain('Amount: USD 480.00')
    expect(offer).toContain('Revisions included: 3')
  })
})

describe('세션 번호 — 03 §2.5', () => {
  it('PF-YYMM-NNNN', () => {
    expect(formatSessionNo(2026, 9, 142)).toBe('PF-2609-0142')
    expect(formatSessionNo(2026, 12, 1)).toBe('PF-2612-0001')
  })

  it('범위를 벗어난 입력은 거부', () => {
    expect(() => formatSessionNo(2026, 13, 1)).toThrow(/MONTH_OUT_OF_RANGE/u)
    expect(() => formatSessionNo(2026, 1, 10000)).toThrow(/SEQ_OUT_OF_RANGE/u)
  })
})
