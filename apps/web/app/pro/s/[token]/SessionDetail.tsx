'use client'

/**
 * P-03 세션 상세 + P-05 검토 — 06 §4 · 04 §5.
 *
 * 검토가 이 화면의 핵심이다. `PAIRWISE` 는 축마다 카드가 정확히 둘이므로
 * "제안" 은 **클라이언트가 고르지 않은 쪽** 하나뿐이다. 자유 입력이 필요 없고,
 * 그래서 임의 조합이 만들어질 경로도 없다.
 *
 * 근거는 여기에만 남는다. 클라이언트에게는 그림 두 장과 수치만 간다 —
 * `toClientView` 가 타입 수준에서 떨어뜨린다 (04 §5.1).
 */
import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { BASES, type Basis } from '@preflight/core'
import type { Copy } from '../../../_lib/copy.ts'
import {
  passReview,
  sendProposals,
  type Deliverables,
  type ReviewDeck,
} from '../../../_lib/actions.ts'
import { Copyable, ErrorNote, useToast } from '../../_ui.tsx'

const MAX = 3

/** 04 §4.2 — 판정 3종. 콘솔에서는 기호가 아니라 한 단어로 보여도 된다 */
const OUTCOME: Readonly<Record<string, string>> = {
  free: 'free',
  counted: 'counted',
  requote: 'requote',
  'out-of-scope': 'out of scope',
  'new-session': 'new order',
}

export function SessionDetail({
  token,
  deck,
  docs,
  dict,
  t,
}: {
  readonly token: string
  readonly deck: ReviewDeck
  readonly docs: Deliverables | null
  readonly dict: Readonly<Record<string, string>>
  readonly locale: string
  readonly t: Copy
}) {
  const [picked, setPicked] = useState<readonly string[]>([])
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()
  const { toast, show } = useToast()

  const sentPending = useMemo(() => deck.sent.filter((n) => n.response === null), [deck.sent])

  const toggle = (axisKey: string) => {
    setPicked((prev) =>
      prev.includes(axisKey)
        ? prev.filter((k) => k !== axisKey)
        : prev.length >= MAX
          ? prev
          : [...prev, axisKey],
    )
  }

  const label = (key: string) => dict[key] ?? key

  return (
    <div className="pro">
      <header className="pro-head">
        <Link className="pro-back" href="/pro">
          ← {t.detailBack}
        </Link>
        <h1>{deck.no}</h1>
        <a className="pro-open" href={`/s/${token}`} target="_blank" rel="noreferrer">
          {t.detailClient} →
        </a>
      </header>

      {/* ── P-05 검토 ──────────────────────────────────────────────── */}
      {deck.reviewGate && !deck.settled && (
        <section className="pro-card">
          <h2>{t.reviewTitle}</h2>

          {sentPending.length > 0 ? (
            <p className="pro-note" data-k="wait">
              {t.reviewWaiting} · {sentPending.length}
            </p>
          ) : !deck.awaitingReview ? (
            <p className="pro-empty">{t.reviewNone}</p>
          ) : done ? (
            <p className="pro-note" data-k="ok">
              {t.reviewSent}
            </p>
          ) : (
            <>
              <p className="pro-note">{t.reviewHint}</p>

              <ul className="pro-axes">
                {deck.axes.map((a) => {
                  const on = picked.includes(a.axisKey)
                  return (
                    <li key={a.axisKey}>
                      <label className="pro-axis" data-on={on}>
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={!on && picked.length >= MAX}
                          onChange={() => toggle(a.axisKey)}
                        />
                        <b>{label(a.axisKey)}</b>
                        {/* measure 는 번역하지 않는다 (02 §3) */}
                        <span className="pro-m">{a.current.measure}</span>
                        <span className="pro-arrow" aria-hidden="true">
                          →
                        </span>
                        <span className="pro-m pro-m-next">{a.proposed.measure}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>

              <label className="pro-reason">
                <span>{t.reviewReason}</span>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.currentTarget.value)}
                  disabled={picked.length === 0}
                />
              </label>

              <div className="pro-actions">
                <button
                  type="button"
                  className="pro-btn pro-btn-ghost"
                  disabled={pending || picked.length > 0}
                  onClick={() => {
                    setError(null)
                    start(() => {
                      void passReview(token).then((r) => {
                        if (r.ok) setDone(true)
                        else setError(r.code)
                      })
                    })
                  }}
                >
                  {t.reviewPass}
                </button>
                <button
                  type="button"
                  className="pro-btn"
                  disabled={pending || picked.length === 0}
                  onClick={() => {
                    setError(null)
                    start(() => {
                      void sendProposals(
                        token,
                        picked.map((axisKey) => ({
                          axisKey,
                          ...(reason.trim() === '' ? {} : { reasonFree: reason.trim() }),
                        })),
                      ).then((r) => {
                        if (r.ok) setDone(true)
                        else setError(r.code)
                      })
                    })
                  }}
                >
                  {t.reviewSend} {picked.length > 0 && <b>{picked.length}</b>}
                </button>
              </div>

              {error !== null && (
                <ErrorNote code={error} messages={t.err} fallback={t.errFallback} />
              )}
            </>
          )}
        </section>
      )}

      {/* ── 산출물 ────────────────────────────────────────────────── */}
      <section className="pro-card">
        {docs === null ? (
          <p className="pro-empty">{t.detailPending}</p>
        ) : (
          <>
            <Copyable
              label={t.sheet}
              text={docs.sheet}
              multiline
              mono
              copyLabel={t.copy}
              onCopied={() => show(t.copied)}
            />
            <Copyable
              label={t.sheetLocal}
              text={docs.sheetLocalized}
              multiline
              mono
              copyLabel={t.copy}
              onCopied={() => show(t.copied)}
            />
            <Copyable
              label={t.offer}
              text={docs.offer}
              multiline
              copyLabel={t.copy}
              onCopied={() => show(t.copied)}
            />
          </>
        )}
      </section>

      {/* ── C-11 수정 요청 ────────────────────────────────────────── */}
      <section className="pro-card">
        <h2>
          {t.requestsTitle} <span className="pro-count">{deck.requests.length}</span>
        </h2>
        {deck.requests.length === 0 ? (
          <p className="pro-empty">{t.requestsEmpty}</p>
        ) : (
          <ul className="pro-reqs">
            {deck.requests.map((r) => (
              <li key={r.id}>
                <span className="pro-req-basis" data-basis={r.basis}>
                  {BASES.includes(r.basis as Basis) ? r.basis : '—'}
                </span>
                <b>{label(r.axisKey)}</b>
                <span className="pro-req-out" data-k={r.verdict.outcome.kind}>
                  {OUTCOME[r.verdict.outcome.kind] ?? r.verdict.outcome.kind}
                </span>
                {/* 제품 전체에서 유일한 자유 텍스트. 클라이언트 로케일 그대로다 */}
                {r.note !== '' && <p className="pro-req-note">{r.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {toast}
    </div>
  )
}
