'use client'

/**
 * P-02 링크 발급 + P-03 세션 목록 — 06 §4.
 *
 * 복사 버튼만 있다. 전송 버튼은 없다. "자동으로 보내주면 편할 텐데" 라는 요청이
 * 와도 만들지 않는다 (09 §6 G-3) — 그 편의의 대가가 고객 계정이다.
 *
 * 상세는 아코디언이 아니라 `/pro/s/{token}` 라우트다. 아코디언이면 새로고침에
 * 닫히고 링크로 남길 수도 없다.
 */
import Link from 'next/link'
import { useState, useTransition } from 'react'
import type { Copy } from '../_lib/copy.ts'
import { issueLink, type IssuedLink, type SessionRow } from '../_lib/actions.ts'
import { dirOf } from '@preflight/core'
import { Icon } from '@preflight/ui'
import { Copyable, ErrorNote, useToast } from './_ui.tsx'

interface ProfileOption {
  readonly slug: string
  readonly name: string
  readonly reversibility: string
}

/** 04 §1 세션 상태를 색 + 모양으로. 색만으로 구분하지 않는다 (NFR-1.3) */
const STATE_DOT: Readonly<Record<string, string>> = {
  ISSUED: 'issued',
  OPENED: 'open',
  IN_PROGRESS: 'open',
  SETTLED: 'settled',
  EXPIRED: 'dead',
  ABANDONED: 'dead',
}

export function ProConsole({
  rows: initialRows,
  profiles,
  locale,
  langs,
  t,
}: {
  readonly rows: readonly SessionRow[]
  readonly profiles: readonly ProfileOption[]
  readonly locale: string
  readonly langs: readonly { readonly code: string; readonly name: string }[]
  readonly t: Copy
}) {
  const [rows] = useState(initialRows)
  const [slug, setSlug] = useState(profiles[0]?.slug ?? '')
  const [label, setLabel] = useState('')
  const [gate, setGate] = useState(false)
  // 붙여넣을 안내문은 **고객**이 읽는다. 그 언어를 아는 사람은 프리랜서뿐이다.
  const [shareLocale, setShareLocale] = useState('en')
  const [issued, setIssued] = useState<IssuedLink | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const { toast, show } = useToast()

  return (
    <div className="pro" lang={locale} dir={dirOf(locale)}>
      <header className="pro-head">
        <h1>Preflight</h1>
        <p>{t.tagline}</p>
        {/* 실제 인증이 붙기 전까지 계정이 하나뿐이라, 이게 없으면 20개 중
            19개 로케일에 도달할 방법이 없다 */}
        <details className="lp-langs pro-langs">
          <summary aria-label={t.signupLocale}>
            <Icon name="globe" size={15} />
            {langs.find((l) => l.code === locale)?.name ?? locale}
          </summary>
          <ul>
            {langs.map((l) => (
              <li key={l.code}>
                <a
                  href={`/pro?lang=${l.code}`}
                  lang={l.code}
                  aria-current={l.code === locale ? 'true' : undefined}
                >
                  {l.name}
                </a>
              </li>
            ))}
          </ul>
        </details>
      </header>

      <section className="pro-card">
        <h2>{t.issueTitle}</h2>

        {/* 유형은 네이티브 select 가 아니라 카드다 — reversibility 가 함께 보여야 한다 */}
        <fieldset className="pro-picker">
          <legend>{t.issueType}</legend>
          {profiles.map((p) => (
            <label key={p.slug} className="pro-pick" data-on={slug === p.slug}>
              <input
                type="radio"
                name="slug"
                value={p.slug}
                checked={slug === p.slug}
                onChange={() => setSlug(p.slug)}
              />
              <b>{p.name}</b>
              <span className="pro-rev" data-rev={p.reversibility}>
                {p.reversibility}
              </span>
            </label>
          ))}
        </fieldset>

        <div className="pro-form">
          <label>
            <span>
              {t.issueLabel} <i>{t.issueLabelHint}</i>
            </span>
            <input value={label} placeholder="Acme Corp" onChange={(e) => setLabel(e.currentTarget.value)} />
          </label>
          <label>
            <span>{t.shareLang}</span>
            <select value={shareLocale} onChange={(e) => setShareLocale(e.currentTarget.value)}>
              {langs.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="pro-btn"
            disabled={pending || slug === ''}
            onClick={() => {
              setError(null)
              start(() => {
                void issueLink(slug, label, gate, shareLocale).then((r) => {
                  if (r.ok) setIssued(r.value)
                  else setError(r.code)
                })
              })
            }}
          >
            {t.issueSubmit}
          </button>
        </div>

        {/* 04 §5.2 — 기본은 꺼짐. 켜면 클라이언트가 다시 와야 한다 */}
        <label className="pro-switch">
          <input type="checkbox" checked={gate} onChange={(e) => setGate(e.currentTarget.checked)} />
          <span>
            <b>{t.issueGate}</b>
            <i>{t.issueGateHint}</i>
          </span>
        </label>

        {error !== null && (
          <ErrorNote
            code={error}
            messages={t.err}
            fallback={t.errFallback}
            {...(error === 'BILLING_REQUIRED'
              ? { cta: { label: t.errBillingCta, href: '/pro/signup' } }
              : {})}
          />
        )}

        {issued && (
          <div className="pro-issued">
            <p className="pro-no">{issued.no}</p>
            <Copyable
              label={t.issuedLink}
              text={issued.clientUrl}
              copyLabel={t.copy}
              onCopied={() => show(t.copied)}
            />
            <Copyable
              label={t.issuedShare}
              text={issued.shareText}
              multiline
              copyLabel={t.copy}
              onCopied={() => show(t.copied)}
            />
            <p className="pro-note">{t.issuedNote}</p>
            <a className="pro-open" href={issued.clientUrl} target="_blank" rel="noreferrer">
              {t.issuedOpen} →
            </a>
          </div>
        )}
      </section>

      <section className="pro-card">
        <h2>
          {t.listTitle} <span className="pro-count">{rows.length}</span>
        </h2>

        {rows.length === 0 ? (
          <p className="pro-empty">{t.listEmpty}</p>
        ) : (
          <ul className="pro-list">
            {rows.map((r) => (
              <li key={r.id}>
                <Link className="pro-row" href={`/pro/s/${r.token}`}>
                  <span className="pro-row-no">{r.no}</span>
                  <span className="pro-row-label">{r.clientLabel || r.profileSlug}</span>
                  <span className="pro-row-state" data-dot={STATE_DOT[r.state] ?? 'open'}>
                    {r.state}
                  </span>
                  <span className="pro-row-prog">
                    {r.locked} / {r.total}
                  </span>
                  <span className="pro-row-amt">${r.amountUsd.toFixed(0)}</span>
                  {/* 지금 손이 필요한 세션은 한눈에 보여야 한다 */}
                  {r.awaitingReview && <span className="pro-flag" data-k="review" />}
                  {r.pendingNegotiations > 0 && <span className="pro-flag" data-k="sent" />}
                  {r.requestCount > 0 && <span className="pro-flag" data-k="req" />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toast}
    </div>
  )
}
