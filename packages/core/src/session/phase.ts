/**
 * 클라이언트 화면 단계 — 06 §3 화면 순서를 상태에서 파생한다.
 *
 * 이 함수가 없던 동안 `Flow.tsx` 가 단계를 **이벤트 핸들러마다 따로** 계산했고,
 * 그래서 경로마다 규칙이 달랐다:
 *
 *   choose()       → awaitingConfirm 을 본다     ✓
 *   openSession()  → 보지 않는다                 ✗ 카드 끝난 뒤 새로고침 → 빈 화면
 *   초기 마운트     → 무조건 entry               ✗ 확정된 링크 재방문 → 빈 화면
 *
 * 경로가 셋이어도 규칙은 하나여야 한다. 그래서 **화면 단계를 저장하지 않는다.**
 * 서버 상태에서 매번 파생한다 — 저장하는 순간 새로고침·재방문에서 어긋난다.
 *
 * 순수 함수라 상태 조합을 표로 고정할 수 있다 (phase.test.ts).
 */

export const PHASES = [
  /** C-01 진입. 보이는 텍스트가 숫자 하나 */
  'entry',
  /** C-02 · C-05 · C-07 · C-08 — 현재 커서의 블록 */
  'block',
  /** C-03 사양 확인 — 카드가 끝나고 확정을 기다린다 */
  'confirm',
  /** C-04 역제안 비교 — 다른 무엇보다 먼저다 */
  'negotiate',
  /** 전 블록 확정 · 프리랜서 검토 대기 (04 §5.2). reviewGate 가 켜진 세션만 */
  'waiting',
  /** C-10 완료 + 사양서 */
  'done',
  /** C-11 피드백 — 확정 이후 수정 요청 */
  'feedback',
] as const

export type Phase = (typeof PHASES)[number]

/**
 * 화면을 정하는 데 필요한 최소 상태.
 *
 * 앱의 FlowState 가 구조적으로 이걸 만족한다. 코어가 앱 타입을 알 필요가 없고,
 * 앱은 이 함수 하나만 부르면 된다.
 */
export interface PhaseInput {
  /** 사양이 확정됐는가 (settledAt !== null) */
  readonly settled: boolean
  /** 확정 이후 클라이언트가 수정 요청을 열었는가 */
  readonly feedbackOpen: boolean
  /** 미응답 역제안 수 */
  readonly pendingNegotiations: number
  /** 지금 열려 있는 블록. 없으면 null */
  readonly cursor: string | null
  /** PAIRWISE 카드가 끝나 확인 화면을 기다리는가 */
  readonly awaitingConfirm: boolean
  /** 클라이언트가 링크를 한 번이라도 열었는가 */
  readonly opened: boolean
}

/**
 * 순서에 이유가 있다.
 *
 * - `settled` 가 최우선이다. 확정된 세션은 어떤 커서 상태여도 사양서를 보여준다.
 * - `negotiate` 가 블록보다 먼저다. 역제안은 흐름 안의 단계가 아니라 **인터럽트**다.
 *   미응답이 남아 있으면 확정이 막히므로(`settle` 의 NEGOTIATION_PENDING),
 *   다른 화면을 먼저 보여주면 클라이언트가 막다른 길에 갇힌다.
 * - `cursor === null` 이 `awaitingConfirm` 보다 먼저다. 커서가 없으면 볼 블록이
 *   없다는 뜻이고, 그 상태의 awaitingConfirm 은 의미가 없다.
 */
export function resolvePhase(s: PhaseInput): Phase {
  if (s.settled) return s.feedbackOpen ? 'feedback' : 'done'
  if (s.pendingNegotiations > 0) return 'negotiate'
  if (s.cursor === null) return 'waiting'
  if (s.awaitingConfirm) return 'confirm'
  if (!s.opened) return 'entry'
  return 'block'
}

/**
 * 지금 확정해도 되는가 — 04 §1.1 · 04 §5.2.
 *
 * 이 판단이 화면 코드 안에 있던 동안 규칙이 하나 빠져 있었다. `canSettle` 만
 * 보고 곧장 확정해서, 아직 열려 있는 **선택 블록**(자료 체크)을 통째로
 * 건너뛰었다. 커서가 비었는지를 먼저 봐야 한다.
 *
 * 순수 함수라 표로 고정된다. 새 관문이 생기면 여기 한 줄이 늘고 테스트가 막는다.
 */
export interface SettleInput {
  readonly settled: boolean
  /** 열려 있는 블록. 남아 있으면 아직 볼 것이 있다 */
  readonly cursor: string | null
  /**
   * 04 §5.2 — 검토 관문이 켜져 있고 **아직 프리랜서가 보지 않았다.**
   *
   * "관문이 켜짐" 이 아니라 "아직 검토 전" 이다. 켜짐으로 판단하면 검토가 끝나고
   * 역제안에 전부 응답한 뒤에도 확정이 영영 막힌다.
   */
  readonly reviewPending: boolean
  readonly pendingNegotiations: number
  /** 필수 블록이 전부 확정됐는가 */
  readonly canSettle: boolean
}

export function shouldSettle(s: SettleInput): boolean {
  if (s.settled) return false
  if (s.cursor !== null) return false
  if (s.reviewPending) return false
  if (s.pendingNegotiations > 0) return false
  return s.canSettle
}
