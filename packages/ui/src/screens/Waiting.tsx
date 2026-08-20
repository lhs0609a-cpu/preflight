/**
 * 확정 대기 — 04 §5.2 2단계.
 *
 * 클라이언트는 전 블록을 끝냈고, 프리랜서 검토(SLA 24h)를 기다린다.
 * 06 에 번호가 없는 이유는 원안이 검토를 클라이언트 화면으로 세지 않았기
 * 때문이다. 그러나 화면이 없으면 게이지만 남은 빈 페이지가 뜬다.
 *
 * 여기서 전할 것은 딱 둘이다 — **네 일은 끝났다**, **기다리는 중이다**.
 * 문장 없이 그 둘을 말하는 방법은 가득 찬 게이지와 시계뿐이다.
 * 열린 자물쇠를 쓴다. 닫힌 자물쇠는 C-10 의 시그니처이며, 아직 확정이 아니다.
 */
import type { ReactNode } from 'react'
import { Gauge, Icon, Num, Ratio } from '../primitives.tsx'

export interface WaitingProps {
  readonly locked: number
  readonly total: number
  /** 04 §5.4 — 검토 기한까지 남은 시간. 시차 때문에 영업일이 아니라 절대 시간이다 */
  readonly hoursLeft?: number
}

export function Waiting({ locked, total, hoursLeft }: WaitingProps): ReactNode {
  return (
    <section className="pf-screen" data-screen="C-WAIT">
      <Icon name="unlock" size={26} label="Your part is done. Waiting for the freelancer to review." />
      <Gauge filled={locked} total={total} />
      <Ratio num={locked} den={total} />

      <p className="pf-wait" aria-label="Time left for the review">
        <Icon name="clock" size={18} />
        {hoursLeft !== undefined && <Num value={hoursLeft} unit="h" />}
      </p>
    </section>
  )
}
