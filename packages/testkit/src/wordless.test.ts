import { describe, expect, it } from 'vitest'
import { scanWordless } from './wordless.ts'
import { CLIENT_SCREENS } from './fixtures/screens.tsx'
import { EXEMPTIONS, STALE_EXEMPTIONS, VIOLATION_SCREENS } from './fixtures/violations.ts'

describe('무언어 검사기 — G-5', () => {
  it('실제 클라이언트 화면 전부가 통과한다', () => {
    const { violations } = scanWordless(CLIENT_SCREENS, EXEMPTIONS)
    expect(violations).toEqual([])
  })

  /**
   * 등재된 예외는 **전부 실제로 쓰여야** 한다. 개수를 박아두면 화면이 늘 때마다
   * 이 줄을 고치게 되고, 고치는 순간 이 테스트는 아무것도 지키지 않는다.
   * 지켜야 할 것은 "등재됐는데 안 쓰이는 예외가 없다" 이다.
   */
  it('등재된 예외가 전부 실제로 쓰인다 — 죽은 예외를 남기지 않는다', () => {
    const used = new Set(scanWordless(CLIENT_SCREENS, EXEMPTIONS).usedExemptions)
    expect(EXEMPTIONS.filter((e) => !used.has(e.id))).toEqual([])
  })

  it('지금 열려 있는 예외는 C-06 톤 견본 하나뿐이다', () => {
    // 결과물이 영문이라 원문을 보여주는 유일한 자리다 (06 §C-06).
    expect(EXEMPTIONS.map((e) => e.screen)).toEqual(['C-06'])
  })

  it('프로파일 4종 × 화면들을 실제로 렌더해서 본다 — 픽스처가 아니다', () => {
    expect(CLIENT_SCREENS.length).toBeGreaterThanOrEqual(20)
    expect(CLIENT_SCREENS.every((s) => s.html.includes('data-screen='))).toBe(true)
  })

  it('5단어짜리 명령문도 막는다 — 단어 수만으로는 못 잡는 구멍', () => {
    // "Pick the one you prefer" 는 정확히 5단어라 단어 수 검사를 그대로 통과한다.
    const { violations } = scanWordless([VIOLATION_SCREENS[0]!], [])
    expect(violations).toHaveLength(1)
    expect(violations[0]!.rule).toBe('sentence-shape')
  })

  it('06 §2.2 의 금지 예시 3종을 전부 막는다', () => {
    for (const text of [
      'Pick the one you prefer',
      'This will require a new quote',
      'Your selections have been saved',
    ]) {
      const { violations } = scanWordless([{ id: 'F', html: `<p>${text}</p>` }], [])
      expect(violations, text).toHaveLength(1)
    }
  })

  it('라벨·measure 는 기능어 규칙에 걸리지 않는다', () => {
    const ok = ['Spacing', '32px', '2 blocks', 'no hero', 'one-touch bottom', 'Main + 5p', 'WB +400K']
    const { violations } = scanWordless(
      [{ id: 'OK', html: ok.map((s) => `<p>${s}</p>`).join('') }],
      [],
    )
    expect(violations).toEqual([])
  })

  it('종결 문장부호를 막는다', () => {
    const { violations } = scanWordless([VIOLATION_SCREENS[1]!], [])
    expect(violations[0]!.rule).toBe('sentence-punctuation')
  })

  it('5단어 초과를 막는다', () => {
    const { violations } = scanWordless([VIOLATION_SCREENS[2]!], [])
    expect(violations[0]).toMatchObject({
      rule: 'too-many-words',
      text: 'This will require a new quote',
    })
  })

  it('등재되지 않은 예외는 예외가 아니다 — 검사 무력화 방지', () => {
    const { violations } = scanWordless([VIOLATION_SCREENS[3]!], [])
    expect(violations).toHaveLength(1)
    expect(violations[0]!.rule).toBe('unregistered-exemption')
  })

  it('쓰이지 않는 등재 항목도 실패시킨다 — 목록이 조용히 불어나는 것 방지', () => {
    const { violations } = scanWordless(CLIENT_SCREENS, STALE_EXEMPTIONS)
    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatchObject({ rule: 'stale-exemption', path: 'nobody-uses-this' })
  })

  it('예외가 쓰이면 통과하고 사용 기록이 남는다', () => {
    const html = `<p data-wordless-exempt="tone">Sick today? Seen today.</p>`
    const exemption = [{ id: 'tone', screen: 'C-06', reason: '결과물이 영문이다' }]
    const r = scanWordless([{ id: 'C-06', html }], exemption)
    expect(r.violations).toEqual([])
    expect(r.usedExemptions).toEqual(['tone'])
  })

  it('aria-label 은 검사하지 않는다 (NFR-4.4)', () => {
    const html = `<button aria-label="Download the specification as a PDF file">x</button>`
    const { violations } = scanWordless([{ id: 'A', html }], [])
    expect(violations).toEqual([])
  })

  it('수치·단위·세션번호는 통과한다 (06 §2.2)', () => {
    const html = `<p>32px</p><p>11%</p><p>$480</p><p>2w</p><p>3 / 6</p><p>PF-2609-0142</p><p>1.5MB</p>`
    const { violations } = scanWordless([{ id: 'B', html }], [])
    expect(violations).toEqual([])
  })
})
