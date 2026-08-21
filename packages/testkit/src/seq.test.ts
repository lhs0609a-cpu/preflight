/**
 * 세션 번호 시퀀스 — 03 §2.5.
 *
 * 그전까지 번호는 인스턴스 메모리 카운터에서 나왔다. 서버리스는 요청마다 다른
 * 인스턴스가 뜰 수 있어서 둘이 같은 번호를 발급하고, session.no 의 UNIQUE 가
 * 그 순간 터진다 — 사용자에게는 "링크 발급 실패" 로 보인다.
 *
 * 여기서 보는 것은 **동시에 불러도 겹치지 않는가** 하나다.
 */
import { describe, expect, it } from 'vitest'
import { formatSessionNo } from '@preflight/core'
import { STORE_ADAPTERS } from './stores.ts'

for (const adapter of STORE_ADAPTERS) {
  describe(`세션 번호 — ${adapter.name}`, () => {
    it('동시에 불러도 번호가 겹치지 않는다', async () => {
      const b = await adapter.make()
      const n = 40
      const got = await Promise.all(
        Array.from({ length: n }, () => b.sessions.nextSeq('202608')),
      )
      expect(new Set(got).size).toBe(n)
      expect(Math.max(...got)).toBe(n)
      await b.close()
    })

    it('달이 바뀌면 1부터 다시 센다 — 번호가 PF-YYMM-NNNN 이다', async () => {
      const b = await adapter.make()
      await b.sessions.nextSeq('202608')
      await b.sessions.nextSeq('202608')
      expect(await b.sessions.nextSeq('202609')).toBe(1)
      expect(await b.sessions.nextSeq('202608')).toBe(3)
      await b.close()
    })

    it('발급한 번호가 그대로 세션 번호가 된다', async () => {
      const b = await adapter.make()
      const seq = await b.sessions.nextSeq('202608')
      expect(formatSessionNo(2026, 8, seq)).toBe('PF-2608-0001')
      await b.close()
    })
  })
}
