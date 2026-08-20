'use client'

/**
 * 콘솔 공용 조각.
 *
 * 06 §4 — 복사 버튼만 있다. 전송 버튼은 없고 앞으로도 만들지 않는다 (G-3).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

/** 복사 성공을 버튼 글자로만 알리면 눈이 딴 데 있을 때 놓친다 */
export function useToast(): {
  toast: ReactNode
  show: (text: string) => void
} {
  const [text, setText] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((t: string) => {
    setText(t)
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => setText(null), 1800)
  }, [])

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current)
  }, [])

  return {
    show,
    toast: (
      <div className="pro-toast" role="status" aria-live="polite" data-on={text !== null}>
        {text}
      </div>
    ),
  }
}

export function Copyable({
  label,
  text,
  multiline,
  mono,
  copyLabel,
  onCopied,
}: {
  readonly label: string
  readonly text: string
  readonly multiline?: boolean
  readonly mono?: boolean
  readonly copyLabel: string
  readonly onCopied: () => void
}) {
  return (
    <div className="pro-copy">
      <div className="pro-copy-head">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(text).then(onCopied)
          }}
        >
          {copyLabel}
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

/** 05 §1 — 내부 코드가 아니라 문구와 행동을 보여준다 */
export function ErrorNote({
  code,
  messages,
  fallback,
  cta,
}: {
  readonly code: string
  readonly messages: Readonly<Record<string, string>>
  readonly fallback: string
  readonly cta?: { readonly label: string; readonly href: string }
}) {
  return (
    <p className="pro-error" role="alert">
      <span>{messages[code] ?? fallback}</span>
      {cta && (
        <a className="pro-error-cta" href={cta.href}>
          {cta.label}
        </a>
      )}
    </p>
  )
}

export function Skeleton({ rows = 3 }: { readonly rows?: number }) {
  return (
    <ul className="pro-skel" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} />
      ))}
    </ul>
  )
}
