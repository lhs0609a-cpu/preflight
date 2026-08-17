import { describe, expect, it } from 'vitest'
import { BANNED_ICON_TERMS, ICONS, bannedTermIn, isIconKey } from './icons.ts'

describe('아이콘 등록소 — 06 §5.4 · L-5', () => {
  it('등록된 아이콘 중 금지 어휘를 포함한 것이 없다', () => {
    const offenders = ICONS.map((i) => [i, bannedTermIn(i)] as const).filter(([, t]) => t !== null)
    expect(offenders).toEqual([])
  })

  it('금지 어휘 목록이 06 §5.4 의 4개 범주를 덮는다', () => {
    for (const term of ['hand', 'face', 'dog', 'pray', 'cross', 'stamp']) {
      expect(BANNED_ICON_TERMS as readonly string[]).toContain(term)
    }
  })

  it('금지 아이콘을 등록하려 하면 검출된다', () => {
    expect(bannedTermIn('thumbs-up')).toBe('thumb')
    expect(bannedTermIn('praying-hands')).not.toBeNull()
    // 국내판 인장은 글로벌에서 쓰지 않는다 (06 §5.3)
    expect(bannedTermIn('seal')).toBe('seal')
  })

  it('중복 등록이 없다', () => {
    expect(new Set(ICONS).size).toBe(ICONS.length)
  })

  it('isIconKey 는 미등록 키를 거부한다', () => {
    expect(isIconKey('lock')).toBe(true)
    expect(isIconKey('thumbs-up')).toBe(false)
  })
})
