/**
 * C-09 팀 대조 — 06 §3 · FR-7.
 *
 * 결정권자가 여럿인 계약에서, 누가 어디서 갈리는지를 한 화면에 놓는다.
 * 팀이 합의하지 못한 축을 프리랜서가 나중에 발견하면 그게 곧 재작업이다.
 *
 * 표시 규칙은 06 §5.2 그대로다 — **색만으로 구분하지 않는다.**
 * 같은 정보를 색·모양·개수 셋으로 동시에 준다.
 *
 *   채워진 점 ●   한쪽(a)을 골랐다
 *   빈 점    ○   다른 쪽(b)을 골랐다
 *   체크 ✓ / 엑스 ✕   그 축에서 전원이 같은가
 *   하단 숫자        갈린 축이 몇 개인가
 *
 * 이름을 쓰지 않는다. A · B · C 는 순서일 뿐이고, 이름을 넣는 순간 로케일이
 * 필요해지며 "누가 틀렸나" 를 가리키는 화면이 된다. 여기서 볼 것은 사람이
 * 아니라 **어느 축이 갈렸는가** 하나다.
 */
import type { ReactNode } from 'react'
import type { Side } from '@preflight/core'
import { Icon, Label, Num } from '../primitives.tsx'

export interface TeamRow {
  /** 축 이름 키. 라벨 번들에 등재된 것만 (3단어 이내) */
  readonly axisKey: string
  /** 팀원 순서대로의 선택. 아직 안 고른 사람은 null */
  readonly picks: readonly (Side | null)[]
}

export interface TeamCompareProps {
  readonly rows: readonly TeamRow[]
  readonly dict: Readonly<Record<string, string>>
  /** 팀원 수. 열 개수를 정한다 */
  readonly members: number
  /** 아직 초대할 수 있는 자리가 남았는가 */
  readonly canInvite?: boolean
  /** 링크를 만들고 클립보드에 넣는다. **보내지 않는다** (09 §2.1) */
  readonly onInvite?: () => void
  /** 방금 복사됐다 */
  readonly copied?: boolean
  readonly busy?: boolean
}

/** 전원이 같은 쪽을 골랐고 빈 칸이 없을 때만 합의다 */
function agreed(picks: readonly (Side | null)[]): boolean {
  const first = picks[0]
  if (first === null || first === undefined) return false
  return picks.every((p) => p === first)
}

export function TeamCompare({
  rows,
  dict,
  members,
  canInvite = false,
  onInvite,
  copied = false,
  busy = false,
}: TeamCompareProps): ReactNode {
  const split = rows.filter((r) => !agreed(r.picks)).length

  return (
    <section className="pf-screen" data-screen="C-09">
      <div className="pf-team" style={{ ['--members' as string]: String(members) }}>
        {/* 머리글은 순서 기호다. 이름을 쓰면 로케일이 필요해진다 */}
        <div className="pf-team-head" aria-hidden="true">
          <span />
          {Array.from({ length: members }, (_, i) => (
            <span key={i} className="pf-team-col">
              {String.fromCharCode(65 + i)}
            </span>
          ))}
          <span />
        </div>

        <ul className="pf-team-rows">
          {rows.map((row) => {
            const ok = agreed(row.picks)
            return (
              <li key={row.axisKey} className="pf-team-row" data-ok={ok}>
                <Label labelKey={row.axisKey} dict={dict} />
                {Array.from({ length: members }, (_, i) => {
                  const p = row.picks[i] ?? null
                  return (
                    <span key={i} className="pf-team-cell">
                      {/* 채워진 점 = a, 빈 점 = b, 없음 = 아직 안 고름 */}
                      {p === null ? (
                        <span className="pf-team-none" />
                      ) : (
                        <Icon name={p === 'a' ? 'dot' : 'circle'} size={13} />
                      )}
                    </span>
                  )
                })}
                <Icon
                  name={ok ? 'check' : 'x'}
                  size={15}
                  label={ok ? 'Everyone chose the same' : 'The team is split on this'}
                />
              </li>
            )
          })}
        </ul>
      </div>

      {/*
        초대. 링크를 만들어 클립보드에 넣기만 한다 — 보내지 않는다(09 §2.1).
        URL 을 글자로 띄우지 않는 이유는 무언어다. 복사 아이콘과 체크로 충분하고,
        주소를 보여준다고 고객이 더 잘 보내지도 않는다.
      */}
      {canInvite && (
        <button
          type="button"
          className="pf-invite"
          aria-label="Copy a link for a teammate"
          disabled={busy}
          onClick={onInvite}
        >
          <Icon name={copied ? 'check' : 'plus'} size={20} />
        </button>
      )}

      {/* 개수가 결론이다. 0 이면 그대로 넘어가도 된다는 뜻 */}
      <footer className="pf-totals" aria-live="polite" aria-label="How many aspects the team is split on">
        <Num value={split} />
        <Icon name="x" size={16} />
      </footer>
    </section>
  )
}
