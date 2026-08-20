import { describe, expect, it } from 'vitest'
import { PHASES, resolvePhase, type Phase, type PhaseInput } from './phase.ts'

/** 기본은 "링크를 막 받은 세션" 이다. 각 케이스는 달라지는 것만 덮어쓴다. */
const base: PhaseInput = {
  settled: false,
  feedbackOpen: false,
  pendingNegotiations: 0,
  cursor: 'taste',
  awaitingConfirm: false,
  opened: false,
}

const at = (over: Partial<PhaseInput>): Phase => resolvePhase({ ...base, ...over })

describe('resolvePhase — 화면 단계는 서버 상태에서 파생된다', () => {
  /**
   * 상태 조합 표. 새 phase 가 늘면 여기 줄이 늘어야 통과한다.
   * 이 표가 곧 06 §3 화면 순서의 기계 판독본이다.
   */
  const table: readonly (Partial<PhaseInput> & { readonly want: Phase; readonly why: string })[] = [
    { want: 'entry', why: '아직 열지 않았다', opened: false },
    { want: 'block', why: '열었고 카드가 남았다', opened: true },
    { want: 'confirm', why: '카드가 끝나 확인을 기다린다', opened: true, awaitingConfirm: true },
    { want: 'waiting', why: '전 블록 확정 · 검토 대기', opened: true, cursor: null },
    { want: 'negotiate', why: '미응답 역제안이 있다', opened: true, pendingNegotiations: 1 },
    { want: 'done', why: '확정됐다', settled: true, cursor: null },
    { want: 'feedback', why: '확정 후 수정 요청을 열었다', settled: true, cursor: null, feedbackOpen: true },
  ]

  for (const row of table) {
    const { want, why, ...over } = row
    it(`${want} — ${why}`, () => {
      expect(at(over)).toBe(want)
    })
  }

  it('모든 phase 가 표에 등장한다 — 새 화면이 검사 없이 늘어나는 것을 막는다', () => {
    const covered = new Set(table.map((r) => r.want))
    expect([...PHASES].filter((p) => !covered.has(p))).toEqual([])
  })

  // ── 우선순위 ─────────────────────────────────────────────────────────

  it('확정이 최우선 — 커서가 남아 있어도 사양서를 보여준다', () => {
    expect(at({ settled: true, cursor: 'taste', opened: true })).toBe('done')
  })

  it('확정이 역제안보다 먼저 — 확정 후에는 되돌릴 수 없다', () => {
    expect(at({ settled: true, pendingNegotiations: 2 })).toBe('done')
  })

  /**
   * 역제안이 블록보다 먼저인 이유: 미응답이 남으면 settle 이 NEGOTIATION_PENDING
   * 으로 막힌다. 블록 화면을 먼저 보여주면 끝까지 가도 확정이 안 되는
   * 막다른 길에 갇힌다.
   */
  it('역제안이 블록보다 먼저 — 아니면 막다른 길이 된다', () => {
    expect(at({ opened: true, pendingNegotiations: 1, cursor: 'scope' })).toBe('negotiate')
  })

  it('역제안이 confirm 보다 먼저', () => {
    expect(at({ opened: true, pendingNegotiations: 1, awaitingConfirm: true })).toBe('negotiate')
  })

  it('역제안이 waiting 보다 먼저', () => {
    expect(at({ opened: true, pendingNegotiations: 1, cursor: null })).toBe('negotiate')
  })

  it('커서가 없으면 awaitingConfirm 은 의미가 없다', () => {
    expect(at({ opened: true, cursor: null, awaitingConfirm: true })).toBe('waiting')
  })

  it('confirm 이 entry 보다 먼저 — 카드를 다 넘긴 뒤 새로고침해도 빈 화면이 아니다', () => {
    expect(at({ opened: false, awaitingConfirm: true })).toBe('confirm')
  })

  // ── 회귀 ─────────────────────────────────────────────────────────────

  it('확정된 링크 재방문이 빈 화면이 아니다 (A2)', () => {
    expect(at({ settled: true, cursor: null, opened: true })).toBe('done')
  })

  it('feedbackOpen 은 확정 전에는 무시된다 — 확정 전에 수정할 것이 없다', () => {
    expect(at({ opened: true, feedbackOpen: true })).toBe('block')
  })

  it('같은 입력이면 항상 같은 결과다', () => {
    const input = { ...base, opened: true }
    expect(resolvePhase(input)).toBe(resolvePhase(input))
  })
})
