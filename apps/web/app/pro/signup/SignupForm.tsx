'use client'

/**
 * P-01 가입 — FR-1.
 *
 * 이 화면에서 사람이 가장 많이 빠져나가는 자리는 2단계(결제수단)다. 그래서
 * 세 가지를 그 자리에 둔다 — **지금 청구되지 않는다**, 카드 번호를 받지
 * 않는다, 왜 그래도 필요한지.
 *
 * 언어 선택은 1단계 안에 있고, 고르는 즉시 화면 문구가 그 언어로 바뀐다.
 * 약속을 문장으로 설명하는 대신 그 자리에서 보여주는 것이다 — 이 제품이
 * 파는 것이 정확히 그것이므로, 여기서 증명하지 못하면 다른 데서도 못 한다.
 *
 * 화면에 마켓플레이스 ID/PW 입력란이 없다. 앞으로도 만들지 않는다 (G-2).
 * 카드 번호를 받는 입력란도 없다. PG 가 발급한 빌링키만 받는다 (NFR-5.4).
 */
import { useState, useTransition } from 'react'
import { dirOf } from '@preflight/core'
import { Icon } from '@preflight/ui'
import { copyFor } from '../../_lib/copy.ts'
import { landingFor } from '../../_lib/landing-copy.ts'
import { registerBilling, signup, type ProView } from '../../_lib/actions.ts'
import { ErrorNote } from '../_ui.tsx'

export function SignupForm({
  locales,
  names,
  initialLocale,
}: {
  readonly locales: readonly string[]
  /** 자국어 이름. 코드로 적으면 자기 언어를 못 찾는다 */
  readonly names: Readonly<Record<string, string>>
  readonly initialLocale: string
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [locale, setLocale] = useState(initialLocale)
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  )
  const [pro, setPro] = useState<ProView | null>(null)
  const [billingKey, setBillingKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  // 고른 언어가 곧바로 화면에 반영된다
  const t = copyFor(locale)
  const l = landingFor(locale)
  const step = pro === null ? 1 : pro.billingVerified ? 3 : 2
  const done = step === 3

  return (
    <div className="su" lang={locale} dir={dirOf(locale)}>
      <nav className="su-nav">
        <a className="lp-mark" href="/">
          Preflight
        </a>
        <span className="su-time">
          <Icon name="clock" size={14} />
          {t.signupTime}
        </span>
      </nav>

      <header className="su-head">
        <h1>{l.h1a.replace(/[.!]$/u, '')} — {t.signupTitle}</h1>
        <p>{t.signupLead}</p>
      </header>

      {/* 2단계뿐이라는 것을 먼저 보여준다. 남은 일이 보이면 끝까지 간다 */}
      <div className="su-rail" aria-label={t.stepOf}>
        <span className="su-rail-fill" style={{ inlineSize: `${((done ? 2 : step) / 2) * 100}%` }} />
      </div>

      <section className="su-card" data-on={step === 1}>
        <h2>
          <span className="su-step" data-done={step > 1}>
            {step > 1 ? <Icon name="check" size={13} /> : 1}
          </span>
          {t.signupAccount}
        </h2>

        <div className="su-grid">
          <label>
            <span>{t.signupEmail}</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              disabled={pro !== null}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
          </label>
          <label>
            <span>{t.signupName}</span>
            <input
              autoComplete="name"
              value={name}
              disabled={pro !== null}
              onChange={(e) => setName(e.currentTarget.value)}
            />
          </label>

          {/* 고르는 즉시 이 화면 전체가 그 언어로 바뀐다 */}
          <label>
            <span>{t.signupLocale}</span>
            <select
              value={locale}
              disabled={pro !== null}
              onChange={(e) => setLocale(e.currentTarget.value)}
            >
              {locales.map((x) => (
                <option key={x} value={x}>
                  {names[x] ?? x}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>
              {t.signupTimezone} <i>{t.signupTimezoneHint}</i>
            </span>
            <input
              value={timezone}
              disabled={pro !== null}
              onChange={(e) => setTimezone(e.currentTarget.value)}
            />
          </label>
        </div>

        {pro === null && (
          <button
            type="button"
            className="su-btn"
            disabled={pending}
            onClick={() => {
              setError(null)
              start(() => {
                void signup({ email, displayName: name, locale, timezone }).then((r) => {
                  if (r.ok) setPro(r.value)
                  else setError(r.code)
                })
              })
            }}
          >
            {t.signupSubmit}
            <Icon name="arrow-right" size={17} />
          </button>
        )}
      </section>

      <section className="su-card" data-on={step === 2} aria-disabled={pro === null}>
        <h2>
          <span className="su-step" data-done={done}>
            {done ? <Icon name="check" size={13} /> : 2}
          </span>
          {t.billingTitle}
        </h2>

        {/* 이탈이 가장 많은 자리다. 안심시킬 문장을 입력란보다 먼저 둔다 */}
        <p className="su-reassure">
          <Icon name="shield" size={16} />
          {t.billingNoCharge}
        </p>
        <p className="su-note">{t.billingNote}</p>

        <div className="su-row">
          <label>
            <span>{t.billingKey}</span>
            <input
              value={billingKey}
              placeholder="bk_live_…"
              disabled={pro === null || pro.billingVerified}
              onChange={(e) => setBillingKey(e.currentTarget.value)}
            />
          </label>
          <button
            type="button"
            className="su-btn"
            disabled={pending || pro === null || pro.billingVerified}
            onClick={() => {
              if (pro === null) return
              setError(null)
              start(() => {
                void registerBilling(pro.id, 'toss', billingKey).then((r) => {
                  if (r.ok) setPro(r.value)
                  else setError(r.code)
                })
              })
            }}
          >
            {t.billingSubmit}
          </button>
        </div>
      </section>

      {error !== null && <ErrorNote code={error} messages={t.err} fallback={t.errFallback} />}

      {done && (
        <section className="su-done">
          <Icon name="check" size={26} />
          <p className="su-done-h">{t.billingDone}</p>
          <a className="lp-cta" href="/pro">
            {t.toConsole}
            <Icon name="arrow-right" size={18} />
          </a>
        </section>
      )}

      {/* 계정 정지가 이 시장의 가장 큰 공포다. 가입 직전에 다시 말한다 */}
      <ul className="su-trust">
        {[
          [l.trust1, l.trust1b],
          [l.trust2, l.trust2b],
          [l.trust3, l.trust3b],
        ].map(([head, body]) => (
          <li key={head}>
            <Icon name="shield" size={15} />
            <b>{head}</b>
            <span>{body}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
