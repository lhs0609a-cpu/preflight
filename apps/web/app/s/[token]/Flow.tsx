'use client'

/**
 * 클라이언트 확정 플로우 — C-01 → C-02 → C-03 → C-05 → C-07 → C-08 → C-10.
 * 그 사이에 C-04 역제안이 인터럽트로 끼어들 수 있고, 확정 뒤에는 C-11 이 열린다.
 *
 * 문장이 없다. 진행은 게이지와 비율이, 결과는 수치가 말한다.
 *
 * 화면 단계를 **저장하지 않는다.** 서버 상태에서 resolvePhase 로 매번 파생한다.
 * 전에는 핸들러마다 따로 계산해서 경로별로 규칙이 달랐고, 그래서 카드를 다
 * 넘긴 뒤 새로고침하거나 확정된 링크를 다시 열면 빈 화면이 나왔다.
 *
 * NFR-3.3 — 탭·키보드(←/→)·스와이프를 전부 받는다. 시차와 저사양 기기를
 * 감안하면 입력 수단을 고르게 할 여유가 없다.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  composedValues,
  linesFromChoices,
  resolvePhase,
  serializedPairAt,
  type Basis,
  type BlockConfig,
  type SerializedPair,
  type Side,
  type Spec,
  type Verdict,
} from '@preflight/core'
import { renderCard, type RenderNode } from '@preflight/render'
import {
  AssetCheck,
  Done,
  Feedback,
  Gauge,
  Icon,
  LinkEntry,
  NegotiationCompare,
  Ratio,
  ScopeAssemble,
  PnrConfirm,
  SpecConfirm,
  StructurePick,
  TasteCards,
  TonePick,
  Waiting,
} from '@preflight/ui'
import {
  answer,
  confirmPnr,
  feedbackAxes,
  negotiationDeck,
  openSession,
  pick,
  respondNegotiation,
  setAsset,
  setScope,
  settleBlock,
  spec as fetchSpec,
  submitFeedback,
  undo,
  type FlowState,
  type NegotiationCard,
} from '../../_lib/actions.ts'

export interface FlowProps {
  readonly token: string
  readonly initial: FlowState
  readonly initialSpec: Spec | null
  readonly steps: number
  readonly dict: Readonly<Record<string, string>>
  readonly configs: Readonly<Record<string, BlockConfig>>
  readonly avatarUrl?: string
}

/**
 * 06 §5.6 — 카드 응답 예산은 100ms 다. 서버 왕복으로는 신흥국 4G 에서
 * 지킬 수 없다. 다음 쌍은 순수 함수(serializedPairAt)와 이미 갖고 있는 config
 * 로 만들 수 있으므로, 화면을 먼저 넘기고 저장은 뒤에서 한다.
 *
 * 서버가 답하면 ghost 를 버리고 서버 상태로 갈아탄다. 실패하면 되감는다 —
 * 로컬이 서버보다 앞서 있는 시간은 한 왕복뿐이다.
 */
interface Ghost {
  readonly blockId: string
  readonly choices: readonly Side[]
  readonly pair: SerializedPair | null
  readonly locked: number
}

export function Flow({ token, initial, initialSpec, steps, dict, configs, avatarUrl }: FlowProps) {
  const [state, setState] = useState<FlowState>(initial)
  const [ghost, setGhost] = useState<Ghost | null>(null)
  const [spec, setSpec] = useState<Spec | null>(initialSpec)
  const [deck, setDeck] = useState<NegotiationCard[] | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  // C-12 보류. 아무것도 기록하지 않으므로 화면 로컬 상태다
  const [held, setHeld] = useState(false)
  const [pending, start] = useTransition()
  const touch = useRef<number | null>(null)

  const phase = resolvePhase({
    settled: state.settled,
    feedbackOpen,
    pendingNegotiations: state.pendingNegotiations,
    cursor: state.cursor,
    awaitingConfirm: state.awaitingConfirm || (ghost !== null && ghost.pair === null),
    opened: state.opened,
  })

  const cursor = state.cursor
  const config = cursor === null ? undefined : configs[cursor]

  /** ghost 가 있으면 그것이 진실이다. 없으면 서버 상태. */
  const shown = useMemo(() => {
    const live = ghost !== null && ghost.blockId === cursor
    return {
      choices: live ? ghost.choices : state.pairChoices,
      pair: live ? ghost.pair : state.pair,
      locked: live ? ghost.locked : state.locked,
    }
  }, [cursor, ghost, state.locked, state.pair, state.pairChoices])

  const commit = useCallback((next: FlowState) => {
    setGhost(null)
    setState(next)
  }, [])

  // ── 카드 ──────────────────────────────────────────────────────────

  const choose = useCallback(
    (side: Side) => {
      if (cursor === null || config?.kind !== 'PAIRWISE') return
      const choices = [...shown.choices, side]
      if (choices.length > config.axes.length) return
      // 화면을 먼저 넘긴다. 다음 쌍은 서버가 필요 없다.
      setGhost({
        blockId: cursor,
        choices,
        pair: serializedPairAt(config, choices.length),
        locked: shown.locked + 1,
      })
      start(() => {
        void answer(token, cursor, side).then(commit, () => setGhost(null))
      })
    },
    [commit, config, cursor, shown.choices, shown.locked, token],
  )

  const goBack = useCallback(() => {
    if (cursor === null || config?.kind !== 'PAIRWISE') return
    const choices = shown.choices.slice(0, -1)
    setGhost({
      blockId: cursor,
      choices,
      pair: serializedPairAt(config, choices.length),
      locked: Math.max(0, shown.locked - 1),
    })
    start(() => {
      void undo(token, cursor).then(commit, () => setGhost(null))
    })
  }, [commit, config, cursor, shown.choices, shown.locked, token])

  // 키보드 ←/→ — 데스크톱 클라이언트가 실제로 많이 쓴다
  useEffect(() => {
    if (phase !== 'block' || config?.kind !== 'PAIRWISE') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') choose('a')
      else if (e.key === 'ArrowRight') choose('b')
      else if (e.key === 'Backspace') goBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choose, config?.kind, goBack, phase])

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

  // ── 단계별로 필요한 것만 뒤늦게 받는다 ────────────────────────────

  useEffect(() => {
    if (phase === 'negotiate' && deck === null) void negotiationDeck(token).then(setDeck)
  }, [deck, phase, token])

  useEffect(() => {
    if ((phase === 'done' || phase === 'feedback') && spec === null) {
      void fetchSpec(token).then(setSpec)
    }
  }, [phase, spec, token])

  // ── 화면 ──────────────────────────────────────────────────────────

  if (phase === 'entry') {
    return (
      <Shell>
        <span />
        <LinkEntry
          steps={steps}
          {...(avatarUrl === undefined ? {} : { avatarUrl })}
          onStart={() => {
            start(() => {
              void openSession(token).then(commit)
            })
          }}
        />
        <span />
      </Shell>
    )
  }

  if (phase === 'waiting') {
    return (
      <Shell>
        <span />
        <Waiting locked={state.locked} total={state.total} />
        <span />
      </Shell>
    )
  }

  if (phase === 'negotiate') {
    const card = deck?.[0]
    return (
      <Shell>
        <Header locked={state.locked} total={state.total} />
        {card === undefined ? (
          <Pending />
        ) : (
          <NegotiationCompare
            item={card.item}
            index={0}
            total={state.pendingNegotiations}
            currentPreview={card.currentPreview as RenderNode}
            proposedPreview={card.proposedPreview as RenderNode}
            onRespond={(response) => {
              start(() => {
                void respondNegotiation(token, card.item.id, response).then((s) => {
                  setDeck(null)
                  commit(s)
                })
              })
            }}
          />
        )}
        <span />
      </Shell>
    )
  }

  if (phase === 'feedback' && spec !== null) {
    return (
      <Shell>
        <span />
        <FeedbackPane
          token={token}
          dict={dict}
          axisKeys={spec.lines.map((l) => l.key)}
          onClose={() => setFeedbackOpen(false)}
        />
        <span />
      </Shell>
    )
  }

  if (phase === 'done') {
    return (
      <Shell>
        <span />
        {spec === null ? (
          <Pending />
        ) : (
          <>
            <Done
              spec={spec}
              dict={dict}
              onDownload={() => {
                window.location.href = `/s/${token}/spec.pdf`
              }}
            />
            <footer className="pf-bar">
              <span />
              <button
                type="button"
                className="pf-ghost"
                aria-label="Ask for a change to what was agreed"
                onClick={() => setFeedbackOpen(true)}
              >
                <Icon name="refresh" size={20} />
              </button>
            </footer>
          </>
        )}
        <span />
      </Shell>
    )
  }

  if (phase === 'confirm' && config?.kind === 'PAIRWISE' && cursor !== null) {
    // 서버 왕복이 없다. linesFromChoices · composedValues · renderCard 는 전부
    // 순수 함수이고 config 는 이미 여기 있다.
    const choices = shown.choices
    const ready = choices.length === config.axes.length
    return (
      <Shell>
        <Header locked={shown.locked} total={state.total} />
        {!ready ? (
          <Pending />
        ) : (
          <SpecConfirm
            lines={linesFromChoices(config, choices)}
            dict={dict}
            preview={renderCard(config.renderer, composedValues(config, choices), {
              w: 260,
              h: 190,
            })}
            onConfirm={() => {
              start(() => {
                void settleBlock(token, cursor).then(commit)
              })
            }}
            onRedo={() => goBack()}
          />
        )}
        <span />
      </Shell>
    )
  }

  return (
    <Shell onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Header locked={shown.locked} total={state.total} />

      {config?.kind === 'PAIRWISE' && shown.pair !== null && (
        <TasteCards
          pair={shown.pair}
          cursor={shown.choices.length}
          total={state.pairTotal || config.axes.length}
          canBack={shown.choices.length > 0}
          onChoose={choose}
          onBack={goBack}
        />
      )}

      {/*
        PICK_N 이 둘로 갈린다. 구조(C-05)는 저충실도 와이어프레임이고,
        톤(C-06)은 **영문 견본**이다 — 결과물이 영문이라 원문을 보여준다.
        슬러그가 아니라 config.style 로 가른다.
      */}
      {config?.kind === 'PICK_N' && cursor !== null && config.style !== 'sample' && (
        <>
          <StructurePick
            config={config}
            dict={dict}
            onPick={(i) => {
              start(() => {
                void pick(token, cursor, i).then(() => {
                  void settleBlock(token, cursor).then(commit)
                })
              })
            }}
          />
          <span />
        </>
      )}

      {config?.kind === 'PICK_N' && cursor !== null && config.style === 'sample' && (
        <>
          <TonePick
            config={config}
            onPick={(i) => {
              start(() => {
                void pick(token, cursor, i).then(() => {
                  void settleBlock(token, cursor).then(commit)
                })
              })
            }}
          />
          <span />
        </>
      )}

      {/*
        C-12. gated 유형(촬영·인쇄)은 컴파일이 REHEARSAL 블록을 흐름에 꽂는데,
        여기 분기가 없던 동안 photo·print 는 취향 카드 다음이 **빈 화면**이었다.
        4개 유형 중 2개가 못 쓰는 상태였다.
      */}
      {config?.kind === 'REHEARSAL' && cursor !== null && (
        <>
          <PnrConfirm
            hoursLeft={state.pnrHoursLeft}
            passed={state.pnrPassed}
            total={config.checkpointKeys.length}
            held={held}
            busy={pending}
            onHold={() => setHeld(true)}
            onResume={() => setHeld(false)}
            onConfirm={() => {
              start(() => {
                void confirmPnr(token, cursor).then(commit)
              })
            }}
          />
          <span />
        </>
      )}

      {config?.kind === 'CHECKLIST' && config.mode === 'scope' && cursor !== null && (
        <>
          <ScopeAssemble
            config={config}
            dict={dict}
            selection={state.scope}
            amountUsd={state.amountUsd}
            weeks={state.weeks}
            onToggle={(i, on) => {
              start(() => {
                void setScope(token, { [String(i)]: on }).then(commit)
              })
            }}
          />
          <ConfirmBar
            disabled={pending}
            label="Confirm this scope"
            onClick={() => {
              start(() => {
                void settleBlock(token, cursor).then(commit)
              })
            }}
          />
        </>
      )}

      {config?.kind === 'CHECKLIST' && config.mode === 'assets' && cursor !== null && (
        <>
          <AssetCheck
            config={config}
            dict={dict}
            states={state.assets}
            provided={state.assetsProvided}
            total={state.assetsTotal}
            delayedDays={state.delayedDays}
            onProvide={(labelKey) => {
              start(() => {
                void setAsset(token, labelKey, { provided: true }).then(commit)
              })
            }}
            onFallback={(labelKey) => {
              start(() => {
                void setAsset(token, labelKey, { fallbackTaken: true }).then(commit)
              })
            }}
          />
          <ConfirmBar
            disabled={pending}
            label="Confirm materials and finish"
            onClick={() => {
              start(() => {
                void settleBlock(token, cursor).then(commit)
              })
            }}
          />
        </>
      )}
    </Shell>
  )
}

// ── 조각 ────────────────────────────────────────────────────────────────

function Shell({
  children,
  onTouchStart,
  onTouchEnd,
}: {
  children: React.ReactNode
  onTouchStart?: (e: React.TouchEvent) => void
  onTouchEnd?: (e: React.TouchEvent) => void
}) {
  return (
    <main className="pf-shell" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {children}
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

/** 문장을 쓸 수 없으므로 자리만 잡아둔다. 스피너도 기호다 */
function Pending() {
  return <div className="pf-pending" aria-label="Loading" />
}

function ConfirmBar({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean
  label: string
  onClick: () => void
}) {
  return (
    <footer className="pf-bar">
      <span />
      <button type="button" className="pf-primary" aria-label={label} disabled={disabled} onClick={onClick}>
        <Icon name="check" size={20} />
      </button>
    </footer>
  )
}

/**
 * C-11 — 확정 이후 수정 요청.
 *
 * Q1~Q3 는 무언어. Q4 자유 입력이 제품 전체에서 유일한 자유 텍스트이며
 * 프리랜서 화면에서만 보인다.
 */
function FeedbackPane({
  token,
  dict,
  axisKeys,
  onClose,
}: {
  token: string
  dict: Readonly<Record<string, string>>
  axisKeys: readonly string[]
  onClose: () => void
}) {
  const [basis, setBasis] = useState<Basis | undefined>(undefined)
  const [axisKey, setAxisKey] = useState<string | undefined>(undefined)
  const [direction, setDirection] = useState(50)
  const [note, setNote] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [busy, startFb] = useTransition()

  useEffect(() => {
    if (axisKeys.length === 0) void feedbackAxes(token)
  }, [axisKeys.length, token])

  return (
    <>
      <Feedback
        axisKeys={axisKeys}
        dict={dict}
        {...(basis === undefined ? {} : { basis })}
        {...(axisKey === undefined ? {} : { axisKey })}
        direction={direction}
        note={note}
        verdict={verdict}
        onBasis={setBasis}
        onAxis={setAxisKey}
        onDirection={setDirection}
        onNote={setNote}
        onSubmit={() => {
          if (basis === undefined || busy) return
          startFb(() => {
            void submitFeedback(token, {
              basis,
              axisKey: axisKey ?? '',
              direction,
              note,
            }).then(setVerdict)
          })
        }}
      />
      <footer className="pf-bar">
        <button type="button" className="pf-ghost" aria-label="Back to the specification" onClick={onClose}>
          <Icon name="arrow-left" size={20} />
        </button>
        <span />
      </footer>
    </>
  )
}
