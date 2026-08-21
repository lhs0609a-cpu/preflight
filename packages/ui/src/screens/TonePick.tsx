/**
 * C-06 톤 선택 — 06 §3 · FR-4.
 *
 * **제품 전체에서 영문이 정당하게 노출되는 유일한 화면이다.**
 *
 * 다른 모든 화면은 문장을 지운다. 여기만 다른 이유는 결과물 자체가 영문이기
 * 때문이다 — 웹사이트 헤드라인, 인쇄물 카피, 광고 문안. 그것을 아이콘이나
 * 수치로 바꿔 보여주면 고객은 **자기가 무엇을 고르는지 알 수 없다.**
 * 번역해서 보여줘도 마찬가지다. 번역본이 마음에 들어도 납품되는 건 원문이다.
 *
 * 그래서 원문을 그대로 보여준다. 대신 두 가지를 지킨다.
 *
 *   1. 라벨을 붙이지 않는다. "신뢰형 / 실용형 / 감성형" 같은 분류어는 아이콘이
 *      대신한다 — 분류어가 붙으면 고객이 문장이 아니라 분류를 고르게 된다.
 *   2. 무언어 검사의 예외로 **등재**한다. 예외가 가장 쉬운 해결책이 되면
 *      검사가 죽으므로, 등재되지 않은 예외는 CI 가 막는다 (06 §2.4 · G-5).
 */
import type { ReactNode } from 'react'
import type { BlockConfig } from '@preflight/core'
import type { IconKey } from '@preflight/render'
import { Icon, Measure } from '../primitives.tsx'

type PickN = Extract<BlockConfig, { kind: 'PICK_N' }>

export interface TonePickProps {
  readonly config: PickN
  readonly selected?: number
  readonly onPick?: (index: number) => void
}

/** 무언어 검사 등재 id. tools/ci/wordless-baseline.json 과 짝이다 */
export const TONE_EXEMPT = 'c06-tone-sample'

export function TonePick({ config, selected, onPick }: TonePickProps): ReactNode {
  return (
    <section className="pf-screen" data-screen="C-06">
      <ul className="pf-tones">
        {config.options.map((option, i) => (
          <li key={option.labelKey}>
            <button
              type="button"
              className="pf-tone"
              data-on={selected === i}
              aria-pressed={selected === i}
              onClick={() => onPick?.(i)}
            >
              {/* 분류어 대신 아이콘. 분류를 고르게 하면 문장을 안 읽는다 */}
              <Icon name={option.icon as IconKey} size={18} />

              {/*
                여기가 그 자리다. 결과물이 영문이라 원문을 보여준다.
                data-wordless-exempt 는 등재된 id 여야 CI 를 통과한다.
              */}
              <span className="pf-tone-sample" data-wordless-exempt={TONE_EXEMPT} lang="en">
                {option.sample ?? ''}
              </span>

              <Measure value={option.measure} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
