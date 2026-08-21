import { describe, expect, it } from 'vitest'
import { LOCALES, shareTextFor } from '@preflight/core'

describe('공유 문구 — FR-3.3', () => {
  it('전 로케일이 자기 언어로 나오고 링크가 끝에 붙는다', () => {
    const url = 'https://pf.work/s/abc'
    const seen = new Set<string>()
    for (const l of LOCALES) {
      const s = shareTextFor(l, url)
      expect(s.endsWith(url)).toBe(true)
      expect(s.length).toBeGreaterThan(url.length + 8)
      seen.add(s)
    }
    // 20개가 전부 달라야 한다 — 같으면 어딘가 영어로 폴백된 것이다
    expect(seen.size).toBe(LOCALES.length)
  })

  it('모르는 로케일은 영어로 떨어진다', () => {
    expect(shareTextFor('zz', 'u')).toBe(shareTextFor('en', 'u'))
  })
})
