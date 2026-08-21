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

/**
 * 01 §1 — 프리랜서 UI 로케일. 클라이언트 UI 는 무언어라 확장이 필요 없다.
 *
 * 공급국(인도 · 방글라데시 · 파키스탄 · 필리핀 · 베트남 · 인니 · 우크라이나 ·
 * 폴란드 · 튀르키예 · 태국 · 중동)과 수요국(미국 · 일본 · 독일 · 프랑스 ·
 * 중국 · 브라질 · 스페인어권 · 한국)을 함께 덮는다.
 *
 * 목록이 늘어도 코드는 안 는다 — 검증은 loadLabelBundle 이 데이터를 보고 한다.
 */
export const LOCALES = [
  'en', 'ko', 'ja', 'zh-CN', 'hi', 'bn', 'ur', 'tl', 'vi', 'th',
  'id', 'ar', 'tr', 'ru', 'uk', 'pl', 'de', 'fr', 'es', 'pt-BR',
] as const
export type Locale = (typeof LOCALES)[number]

/** 글이 오른쪽에서 왼쪽으로 흐르는 로케일 */
export type Direction = 'ltr' | 'rtl'

export interface LocaleInfo {
  /** **자국어** 표기. 20개를 코드로 늘어놓으면 아무도 자기 언어를 못 찾는다 */
  readonly nativeName: string
  readonly dir: Direction
}

/**
 * 로케일 메타.
 *
 * dir 이 여기 있는 이유: 화면 코드가 로케일을 보고 방향을 분기하면 로케일이
 * 늘 때마다 그 분기를 고쳐야 한다. 데이터로 두면 배열에 한 줄 더하는 것이 전부다.
 *
 * 다행히 스타일시트는 처음부터 논리적 속성(inline-size · margin-inline …)만
 * 써서 물리적 속성이 0개다. dir 만 걸면 레이아웃이 통째로 뒤집힌다.
 */
export const LOCALE_INFO: Readonly<Record<Locale, LocaleInfo>> = Object.freeze({
  en: { nativeName: 'English', dir: 'ltr' },
  ko: { nativeName: '한국어', dir: 'ltr' },
  ja: { nativeName: '日本語', dir: 'ltr' },
  'zh-CN': { nativeName: '简体中文', dir: 'ltr' },
  hi: { nativeName: 'हिन्दी', dir: 'ltr' },
  bn: { nativeName: 'বাংলা', dir: 'ltr' },
  ur: { nativeName: 'اردو', dir: 'rtl' },
  tl: { nativeName: 'Filipino', dir: 'ltr' },
  vi: { nativeName: 'Tiếng Việt', dir: 'ltr' },
  th: { nativeName: 'ไทย', dir: 'ltr' },
  id: { nativeName: 'Bahasa Indonesia', dir: 'ltr' },
  ar: { nativeName: 'العربية', dir: 'rtl' },
  tr: { nativeName: 'Türkçe', dir: 'ltr' },
  ru: { nativeName: 'Русский', dir: 'ltr' },
  uk: { nativeName: 'Українська', dir: 'ltr' },
  pl: { nativeName: 'Polski', dir: 'ltr' },
  de: { nativeName: 'Deutsch', dir: 'ltr' },
  fr: { nativeName: 'Français', dir: 'ltr' },
  es: { nativeName: 'Español', dir: 'ltr' },
  'pt-BR': { nativeName: 'Português (BR)', dir: 'ltr' },
})

export function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x)
}

export function dirOf(locale: string): Direction {
  return isLocale(locale) ? LOCALE_INFO[locale].dir : 'ltr'
}

/** NFR-1.2 — 전 언어 동시 검증 상한 */
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
