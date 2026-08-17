/**
 * 라벨.
 *
 * 06 §2.2 · 02 §2 L-2 — 클라이언트 화면에 나갈 수 있는 텍스트는 라벨 키뿐이다.
 *
 * 키 목록을 TS 유니온으로 두지 않는 이유:
 *   새 거래 유형은 새 라벨을 데려온다. 유니온이면 유형 추가마다 .ts 를 고쳐야 하고
 *   그 순간 07 합격 기준 2("코드 변경 0줄")가 깨진다.
 *   따라서 등록소는 로케일 JSON(데이터)이고, 검증은 로드 시점에 한다.
 *
 * 그래도 t() 에 아무 문자열이나 못 넘긴다 — 브랜드 타입이 검증을 통과한 키만 만든다.
 */
import { invariant, wordCount } from '../invariant.ts'

/** 01 §1 — 프리랜서 UI 로케일. 클라이언트 UI 는 무언어라 확장이 필요 없다. */
export const LOCALES = ['ko', 'en', 'hi', 'tl', 'vi', 'uk', 'es', 'pt-BR'] as const
export type Locale = (typeof LOCALES)[number]

/** NFR-1.2 — 8개 언어 동시 검증 상한 */
export const MAX_LABEL_WORDS = 3

declare const LabelBrand: unique symbol

/** 전 로케일에 존재하고 전부 3단어 이내임이 확인된 키. */
export type LabelKey = string & { readonly [LabelBrand]: true }

export type Dictionary = Readonly<Record<string, string>>
export type LabelBundle = Readonly<Record<Locale, Dictionary>>

export interface BundleIssue {
  readonly code: 'MISSING' | 'TOO_LONG' | 'EMPTY'
  readonly locale: Locale
  readonly key: string
  readonly detail?: string
}

/**
 * 번들 검증. 영어로 2단어여도 힌디어로 6단어면 그 로케일에서 무언어가 깨진다.
 * 한국어 사용자가 알아챌 방법이 없으므로 기계가 본다.
 */
export function validateBundle(bundle: LabelBundle): BundleIssue[] {
  const issues: BundleIssue[] = []
  const allKeys = new Set<string>()
  for (const locale of LOCALES) for (const k of Object.keys(bundle[locale] ?? {})) allKeys.add(k)

  for (const locale of LOCALES) {
    const dict = bundle[locale] ?? {}
    for (const key of allKeys) {
      const value = dict[key]
      if (value === undefined) {
        issues.push({ code: 'MISSING', locale, key })
        continue
      }
      if (value.trim().length === 0) {
        issues.push({ code: 'EMPTY', locale, key })
        continue
      }
      const n = wordCount(value)
      if (n > MAX_LABEL_WORDS) {
        issues.push({ code: 'TOO_LONG', locale, key, detail: `${n} words: "${value}"` })
      }
    }
  }
  return issues
}

/** 번들에 실린 키 집합. 프로파일 검증이 이걸 기준으로 본다. */
export function bundleKeys(bundle: LabelBundle): ReadonlySet<string> {
  return new Set(Object.keys(bundle.en ?? {}))
}

export function labelKey(raw: string, keys: ReadonlySet<string>): LabelKey {
  invariant(keys.has(raw), 'LABEL_KEY_UNREGISTERED', raw)
  return raw as LabelKey
}

/**
 * 유일한 번역 경로.
 *
 * 인자가 LabelKey(브랜드)라 Measure(다른 브랜드)는 대입되지 않는다.
 * → t(line.measure) 는 컴파일 에러. 02 §3 을 컴파일러가 지킨다.
 */
export function t(key: LabelKey, dict: Dictionary): string {
  const v = dict[key]
  invariant(v !== undefined, 'LABEL_MISSING_AT_RUNTIME', key)
  return v
}
