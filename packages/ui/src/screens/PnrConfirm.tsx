/**
 * C-12 되돌림 한계점 확인 — 06 §3 · 04 §3 · FR-10.
 *
 * gated 유형(촬영 · 인쇄)에는 **그 뒤로는 되돌릴 수 없는 지점**이 있다.
 * 셔터를 누르고 나면, 인쇄기를 돌리고 나면 수정이란 게 존재하지 않는다.
 * 그 사실을 넘기기 **전에** 알려야 하고, 알린 기록이 남아야 한다.
 *
 * 이 화면이 어려운 이유는 전할 내용이 경고이기 때문이다. 경고는 보통 문장으로
 * 하는데 여기서는 못 쓴다. 그래서 셋으로 나눠 말한다.
 *
 *   남은 시간   아직 되돌릴 수 있는 창이 얼마나 남았는가
 *   체크포인트  리허설에서 확인한 항목들 (04 §3.3 — 통과 전에는 진입 불가)
 *   → ✕        이 지점을 넘으면 되돌아오는 화살표가 막힌다
 *
 * 버튼이 둘이다. 확인(✓)과 **보류(⏸)**. 보류가 없으면 이 화면은 경고가 아니라
 * 통과 절차가 된다 — 멈출 수 없는 경고는 경고가 아니다.
 */
import type { ReactNode } from 'react'
import { Icon, Num } from '../primitives.tsx'

export interface PnrConfirmProps {
  /** 되돌릴 수 있는 창이 닫히기까지 남은 시간 */
  readonly hoursLeft: number
  /** 리허설 체크포인트. 통과한 수 / 전체 */
  readonly passed: number
  readonly total: number
  readonly onConfirm?: () => void
  readonly onHold?: () => void
  readonly onResume?: () => void
  /** 보류를 눌렀다. 아무것도 기록되지 않았고 결정만 미뤄진 상태 */
  readonly held?: boolean
  readonly busy?: boolean
}

export function PnrConfirm({
  hoursLeft,
  passed,
  total,
  onConfirm,
  onHold,
  onResume,
  held = false,
  busy = false,
}: PnrConfirmProps): ReactNode {
  const ready = passed >= total

  /*
   * 보류 상태. 아무것도 기록하지 않는다 — 링크를 다시 열면 이 화면으로 돌아온다.
   * 버튼이 눌렸다는 사실만 화면에 남긴다. 아무 반응이 없으면 눌리지 않은 줄 안다.
   */
  if (held) {
    return (
      <section className="pf-screen" data-screen="C-12" data-held="true">
        <Icon name="pause" size={26} label="On hold. Nothing has been finalised" />
        <p className="pf-pnr-clock">
          <Icon name="clock" size={18} />
          <Num value={hoursLeft} unit="h" />
        </p>
        <button
          type="button"
          className="pf-ghost"
          aria-label="Go back to the confirmation"
          onClick={onResume}
        >
          <Icon name="arrow-right" size={20} />
        </button>
      </section>
    )
  }

  return (
    <section className="pf-screen" data-screen="C-12">
      {/* 1. 아직 남은 창 */}
      <p className="pf-pnr-clock" aria-label="Time left before this becomes final">
        <Icon name="clock" size={20} />
        <Num value={hoursLeft} unit="h" />
      </p>

      {/* 2. 리허설에서 확인한 것들. 04 §3.3 — 통과 전에는 넘어갈 수 없다 */}
      <ul className="pf-pnr-checks" aria-label={`${passed} of ${total} checks passed`}>
        {Array.from({ length: total }, (_, i) => (
          <li key={i}>
            <Icon name={i < passed ? 'check' : 'circle'} size={20} />
          </li>
        ))}
      </ul>

      {/*
        3. 이 지점의 의미. 되돌아가는 화살표에 ✕ 가 겹친다 —
        문장 없이 "여기서부터는 되돌릴 수 없다" 를 말하는 방법이다.
      */}
      <p className="pf-pnr-mark" aria-label="After this point, changes are no longer possible">
        <Icon name="arrow-back" size={26} />
        <Icon name="x" size={26} />
      </p>

      {/* 멈출 수 없는 경고는 경고가 아니다. 보류가 확인과 같은 무게로 있다 */}
      <footer className="pf-bar pf-pnr-bar">
        <button
          type="button"
          className="pf-ghost"
          aria-label="Hold. Do not pass this point yet"
          disabled={busy}
          onClick={onHold}
        >
          <Icon name="pause" size={20} />
        </button>
        <button
          type="button"
          className="pf-primary pf-primary-stop"
          aria-label="Confirm. Changes will no longer be possible after this"
          disabled={busy || !ready}
          onClick={onConfirm}
        >
          <Icon name="check" size={20} />
        </button>
      </footer>
    </section>
  )
}
