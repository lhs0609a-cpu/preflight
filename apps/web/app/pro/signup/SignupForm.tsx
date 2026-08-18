'use client'

/**
 * P-01 가입 + 빌링키 등록.
 *
 * 화면에 마켓플레이스 ID/PW 입력란이 없다. 앞으로도 만들지 않는다 (G-2).
 * 계정 공유는 정지 사유이고, 손해는 우리가 아니라 고객이 본다 (09 §2.2).
 *
 * 카드 번호를 받는 입력란도 없다. PG 가 발급한 빌링키만 받는다 (NFR-5.4).
 */
import { useState, useTransition } from 'react'
import { registerBilling, signup, type ProView } from '../../_lib/actions.ts'

export function SignupForm({ locales }: { readonly locales: readonly string[] }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [locale, setLocale] = useState('ko')
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  )
  const [pro, setPro] = useState<ProView | null>(null)
  const [billingKey, setBillingKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const run = (fn: () => Promise<void>) => {
    setError(null)
    start(() => {
      void fn().catch((e: unknown) => setError(String((e as Error).message)))
    })
  }

  return (
    <div className="pro">
      <header className="pro-head">
        <h1>프리랜서 가입</h1>
        <p>영어를 못 해도 수주합니다. 클라이언트는 고르기만 하면 됩니다.</p>
      </header>

      <section className="pro-card">
        <h2>1 · 계정</h2>
        <div className="pro-form pro-form-2">
          <label>
            <span>이메일</span>
            <input
              type="email"
              value={email}
              disabled={pro !== null}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
          </label>
          <label>
            <span>표시 이름</span>
            <input value={name} disabled={pro !== null} onChange={(e) => setName(e.currentTarget.value)} />
          </label>
          <label>
            <span>UI 언어</span>
            <select value={locale} disabled={pro !== null} onChange={(e) => setLocale(e.currentTarget.value)}>
              {locales.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>타임존 (알림 시각 계산)</span>
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
            className="pro-btn"
            disabled={pending}
            onClick={() => run(async () => setPro(await signup({ email, displayName: name, locale, timezone })))}
          >
            가입
          </button>
        )}
        {pro !== null && <p className="pro-note">가입 완료 · {pro.email}</p>}
      </section>

      <section className="pro-card" aria-disabled={pro === null}>
        <h2>2 · 결제수단</h2>
        <p className="pro-note">
          가입은 무료입니다. 계약이 성사된 뒤에만 수수료가 붙습니다. 그래도 링크 발급 전에
          결제수단이 필요합니다 — 후청구 구조라 등록 없이는 수수료를 받을 방법이 없습니다.
          <br />
          카드 번호는 저장하지 않습니다. PG 사가 발급한 빌링키만 보관합니다.
        </p>
        <div className="pro-form">
          <label>
            <span>PG 빌링키</span>
            <input
              value={billingKey}
              placeholder="bk_live_…"
              disabled={pro === null || pro.billingVerified}
              onChange={(e) => setBillingKey(e.currentTarget.value)}
            />
          </label>
          <button
            type="button"
            className="pro-btn"
            disabled={pending || pro === null || pro.billingVerified}
            onClick={() =>
              run(async () => setPro(await registerBilling(pro!.id, 'toss', billingKey)))
            }
          >
            등록
          </button>
        </div>
        {pro?.billingVerified === true && (
          <p className="pro-issued pro-no">등록 완료 — 이제 링크를 발급할 수 있습니다</p>
        )}
      </section>

      {error !== null && (
        <p className="pro-error" role="alert">
          {error}
        </p>
      )}

      <footer className="pro-card">
        <a className="pro-open" href="/pro">
          콘솔로 →
        </a>
      </footer>
    </div>
  )
}
