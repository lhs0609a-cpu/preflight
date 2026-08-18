'use client'

/**
 * 클라이언트 확정 플로우 — C-01 → C-02 → C-03 → C-05 → C-07 → C-10.
 *
 * 문장이 없다. 진행은 게이지와 비율이, 결과는 수치가 말한다.
 *
 * NFR-3.3 — 탭·키보드(←/→)·스와이프를 전부 받는다. 시차와 저사양 기기를
 * 감안하면 입력 수단을 고르게 할 여유가 없다.
 */
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import type { BlockConfig, SerializedPair, Side, Spec } from '@preflight/core'
import type { RenderNode } from '@preflight/render'
import {
  Done,
  Gauge,
  Icon,
  LinkEntry,
  Ratio,
  ScopeAssemble,
  SpecConfirm,
  StructurePick,
  TasteCards,
} from '@preflight/ui'
import {
  answer,
  confirmView,
  openSession,
  pick,
  setScope,
  settle,
  settleBlock,
  undo,
  type ConfirmView,
  type FlowState,
} from '../../_lib/actions.ts'

export interface FlowProps {
  readonly token: string
  readonly initial: FlowState
  readonly steps: number
  readonly dict: Readonly<Record<string, string>>
  readonly configs: Readonly<Record<string, BlockConfig>>
  readonly avatarUrl?: string
}

type Phase = 'entry' | 'block' | 'confirm' | 'done'

export function Flow({ token, initial, steps, dict, configs, avatarUrl }: FlowProps) {
  const [state, setState] = useState<FlowState>(initial)
  const [phase, setPhase] = useState<Phase>('entry')
  const [confirm, setConfirm] = useState<ConfirmView | null>(null)
  const [spec, setSpec] = useState<Spec | null>(null)
  const [scopeSel, setScopeSel] = useState<Record<string, boolean>>({})
  const [pending, start] = useTransition()
  const touch = useRef<number | null>(null)

  const advance = useCallback(
    (next: FlowState) => {
      setState(next)
      if (next.awaitingConfirm && next.cursor !== null) {
        void confirmView(token, next.cursor).then((c) => {
          setConfirm(c)
          setPhase('confirm')
        })
      }
    },
    [token],
  )

  const choose = useCallback(
    (side: Side) => {
      if (state.cursor === null || pending) return
      start(() => {
        void answer(token, state.cursor!, side).then(advance)
      })
    },
    [advance, pending, state.cursor, token],
  )

  const goBack = useCallback(() => {
    if (state.cursor === null) return
    start(() => {
      void undo(token, state.cursor!).then(setState)
    })
  }, [state.cursor, token])

  // 키보드 ←/→ — 데스크톱 클라이언트가 실제로 많이 쓴다
  useEffect(() => {
    if (phase !== 'block' || state.blockType !== 'PAIRWISE') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') choose('a')
      else if (e.key === 'ArrowRight') choose('b')
      else if (e.key === 'Backspace') goBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choose, goBack, phase, state.blockType])

  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const from = touch.current
    const to = e.changedTouches[0]?.clientX ?? null
    touch.current = null
    if (from === null || to === null) return
    const dx = to - from
    if (Math.abs(dx) < 48) return
    choose(dx > 0 ? 'a' : 'b')
  }

  // ── 화면 ────────────────────────────────────────────────────────────

  if (phase === 'entry') {
    return (
      <main className="pf-shell">
        <span />
        <LinkEntry
          steps={steps}
          {...(avatarUrl === undefined ? {} : { avatarUrl })}
          onStart={() => {
            start(() => {
              void openSession(token).then((s) => {
                setState(s)
                setPhase('block')
              })
            })
          }}
        />
        <span />
      </main>
    )
  }

  if (phase === 'done' && spec !== null) {
    return (
      <main className="pf-shell">
        <span />
        <Done spec={spec} dict={dict} />
        <span />
      </main>
    )
  }

  if (phase === 'confirm' && confirm !== null && state.cursor !== null) {
    const blockId = state.cursor
    return (
      <main className="pf-shell">
        <Header locked={state.locked} total={state.total} />
        <SpecConfirm
          lines={confirm.lines}
          dict={dict}
          preview={confirm.preview as RenderNode}
          onConfirm={() => {
            start(() => {
              void settleBlock(token, blockId).then((s) => {
                setConfirm(null)
                setPhase('block')
                setState(s)
                if (s.cursor === null && s.canSettle) {
                  void settle(token).then((sp) => {
                    setSpec(sp)
                    setPhase('done')
                  })
                }
              })
            })
          }}
          onRedo={() => {
            start(() => {
              void undo(token, blockId).then((s) => {
                setConfirm(null)
                setPhase('block')
                setState(s)
              })
            })
          }}
        />
        <span />
      </main>
    )
  }

  const cursor = state.cursor
  const config = cursor === null ? undefined : configs[cursor]

  return (
    <main className="pf-shell" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Header locked={state.locked} total={state.total} />

      {config?.kind === 'PAIRWISE' && state.pair !== null && (
        <TasteCards
          pair={state.pair as SerializedPair}
          cursor={state.pairCursor}
          total={state.pairTotal}
          canBack={state.pairCursor > 0}
          onChoose={choose}
          onBack={goBack}
        />
      )}

      {config?.kind === 'PICK_N' && cursor !== null && (
        <>
          <StructurePick
            config={config}
            dict={dict}
            onPick={(i) => {
              start(() => {
                void pick(token, cursor, i).then(() => {
                  void settleBlock(token, cursor).then(setState)
                })
              })
            }}
          />
          <span />
        </>
      )}

      {config?.kind === 'CHECKLIST' && cursor !== null && (
        <>
          <ScopeAssemble
            config={config}
            dict={dict}
            selection={scopeSel}
            amountUsd={state.amountUsd}
            weeks={state.weeks}
            onToggle={(i, on) => {
              const next = { ...scopeSel, [String(i)]: on }
              setScopeSel(next)
              start(() => {
                void setScope(token, next).then(setState)
              })
            }}
          />
          <footer className="pf-bar">
            <span />
            <button
              type="button"
              className="pf-primary"
              aria-label="Confirm this scope and finish"
              disabled={pending}
              onClick={() => {
                start(() => {
                  void settleBlock(token, cursor).then((s) => {
                    setState(s)
                    if (s.canSettle) {
                      void settle(token).then((sp) => {
                        setSpec(sp)
                        setPhase('done')
                      })
                    }
                  })
                })
              }}
            >
              <Icon name="check" size={20} />
            </button>
          </footer>
        </>
      )}
    </main>
  )
}

function Header({ locked, total }: { locked: number; total: number }) {
  return (
    <header className="pf-progress">
      <Gauge filled={locked} total={total} w={150} />
      <Ratio num={locked} den={total} />
    </header>
  )
}
