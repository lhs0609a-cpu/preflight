'use client'

/**
 * 06 §4 — 복사 버튼만 있다. 전송 버튼은 없다.
 *
 * "자동으로 보내주면 편할 텐데"라는 요청이 와도 만들지 않는다 (09 §6 G-3).
 * 그 편의의 대가가 고객 계정이다. UI 차원에서 유혹을 제거한다.
 */
import { useState, useTransition } from 'react'
import {
  deliverables,
  issueLink,
  listSessions,
  type Deliverables,
  type IssuedLink,
  type SessionRow,
} from '../_lib/actions.ts'

interface ProfileOption {
  readonly slug: string
  readonly name: string
  readonly reversibility: string
}

export function ProConsole({
  rows: initialRows,
  profiles,
}: {
  readonly rows: readonly SessionRow[]
  readonly profiles: readonly ProfileOption[]
}) {
  const [rows, setRows] = useState(initialRows)
  const [slug, setSlug] = useState(profiles[0]?.slug ?? '')
  const [label, setLabel] = useState('')
  const [issued, setIssued] = useState<IssuedLink | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [docs, setDocs] = useState<Deliverables | null>(null)
  const [pending, start] = useTransition()

  const refresh = () => void listSessions().then(setRows)

  return (
    <div className="pro">
      <header className="pro-head">
        <h1>Preflight</h1>
        <p>Agree before you start. In any language.</p>
      </header>

      <section className="pro-card">
        <h2>새 확정 링크</h2>
        <div className="pro-form">
          <label>
            <span>거래 유형</span>
            <select value={slug} onChange={(e) => setSlug(e.currentTarget.value)}>
              {profiles.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} · {p.reversibility}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>클라이언트 메모</span>
            <input
              value={label}
              placeholder="Acme Corp"
              onChange={(e) => setLabel(e.currentTarget.value)}
            />
          </label>
          <button
            type="button"
            className="pro-btn"
            disabled={pending || slug === ''}
            onClick={() => {
              start(() => {
                void issueLink(slug, label).then((r) => {
                  setIssued(r)
                  refresh()
                })
              })
            }}
          >
            링크 발급
          </button>
        </div>

        {issued && (
          <div className="pro-issued">
            <p className="pro-no">{issued.no}</p>
            <Copyable label="링크" text={issued.clientUrl} />
            <Copyable label="안내문 (영문)" text={issued.shareText} multiline />
            <p className="pro-note">
              발송은 직접 하세요. 마켓플레이스 메시지에 붙여넣으면 됩니다 —
              자동 전송은 계정 정지 사유라 제공하지 않습니다.
            </p>
            <a className="pro-open" href={issued.clientUrl} target="_blank" rel="noreferrer">
              클라이언트 화면 열어보기 →
            </a>
          </div>
        )}
      </section>

      <section className="pro-card">
        <h2>진행 중 ({rows.length})</h2>
        {rows.length === 0 && <p className="pro-empty">아직 발급한 링크가 없습니다.</p>}
        <ul className="pro-list">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="pro-row"
                onClick={() => {
                  const next = open === r.token ? null : r.token
                  setOpen(next)
                  setDocs(null)
                  if (next) void deliverables(next).then(setDocs)
                }}
              >
                <span className="pro-row-no">{r.no}</span>
                <span className="pro-row-label">{r.clientLabel || r.profileSlug}</span>
                <span className="pro-row-state" data-state={r.state}>
                  {r.state}
                </span>
                <span className="pro-row-prog">
                  {r.locked} / {r.total}
                </span>
                <span className="pro-row-amt">${r.amountUsd.toFixed(0)}</span>
              </button>

              {open === r.token && (
                <div className="pro-detail">
                  <a className="pro-open" href={`/s/${r.token}`} target="_blank" rel="noreferrer">
                    클라이언트 화면 →
                  </a>
                  {docs === null ? (
                    <p className="pro-note">사양이 확정되면 사양서와 오퍼 텍스트가 생성됩니다.</p>
                  ) : (
                    <>
                      <Copyable label="사양서 (언어 중립)" text={docs.sheet} multiline mono />
                      <Copyable label="사양서 (한국어 병기)" text={docs.sheetLocalized} multiline mono />
                      <Copyable label="마켓플레이스 오퍼 (영문)" text={docs.offer} multiline />
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Copyable({
  label,
  text,
  multiline,
  mono,
}: {
  readonly label: string
  readonly text: string
  readonly multiline?: boolean
  readonly mono?: boolean
}) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="pro-copy">
      <div className="pro-copy-head">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(text).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1400)
            })
          }}
        >
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      {multiline ? (
        <pre className={mono ? 'pro-pre pro-pre-mono' : 'pro-pre'}>{text}</pre>
      ) : (
        <code className="pro-inline">{text}</code>
      )}
    </div>
  )
}
