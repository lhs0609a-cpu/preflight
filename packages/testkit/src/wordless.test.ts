import { describe, expect, it } from 'vitest'
import { scanWordless } from './wordless.ts'
import { CLIENT_SCREENS } from './fixtures/screens.ts'
import { EXEMPTIONS, STALE_EXEMPTIONS, VIOLATION_SCREENS } from './fixtures/violations.ts'

describe('무언어 검사기 — G-5', () => {
  it('클라이언트 화면 골격은 통과한다', () => {
    const { violations } = scanWordless(CLIENT_SCREENS, EXEMPTIONS)
    expect(violations).toEqual([])
  })

  it('C-06 톤 샘플 예외가 실제로 쓰인다', () => {
    const { usedExemptions } = scanWordless(CLIENT_SCREENS, EXEMPTIONS)
    expect(usedExemptions).toEqual(['c06-tone-samples'])
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
