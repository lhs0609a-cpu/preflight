/**
 * 문구 검사 — 20개 로케일이 **실제로** 번역돼 있는지 본다.
 *
 * 타입은 "키가 다 있는가" 까지만 본다. 값이 영어 그대로여도 통과한다.
 * 로케일이 20종이 되면 그 구멍이 곧 제품의 구멍이 된다 — 화면은 멀쩡히 뜨는데
 * 우르두어 사용자가 영어 문장을 읽게 되고, 아무도 알아채지 못한다.
 *
 * 세 가지를 본다.
 *
 *   1. 영어 폴백    비영어 로케일의 값이 영어와 같으면 실패.
 *                  정당한 경우가 있다 ("Email", "Console") — 그건 baseline 에
 *                  **명시적으로** 등재해야 한다. 무언어 검사와 같은 규칙이다:
 *                  예외가 가장 쉬운 해결책이 되면 검사가 죽는다.
 *
 *   2. 문자 체계    태국어 값에 키릴 문자가 섞이는 식의 오염. 사람 눈으로는
 *                  거의 안 보인다 — "บรีф" 의 ф 는 키릴이다. 실제로 나왔다.
 *
 *   3. 서식        공백·괄호·반복 단어처럼 **언어를 몰라도** 잡히는 오류.
 *                  19개 언어를 눈으로 교정할 수는 없으니, 기계가 볼 수 있는
 *                  만큼은 기계가 본다.
 *
 * 어감·관용성은 여기서 못 본다. 그건 원어민 검수의 몫이고 07 §5.3 에 있다.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOCALES, LOCALE_INFO, type Locale } from '@preflight/core'
import { copyFor } from '../../apps/web/app/_lib/copy.ts'
import { landingFor } from '../../apps/web/app/_lib/landing-copy.ts'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const BASELINE = path.join(HERE, 'copy-baseline.json')

/** 그 로케일에 고유 문자가 하나도 없으면 번역이 통째로 빠진 것이다 */
const SCRIPT: Readonly<Partial<Record<Locale, RegExp>>> = {
  ko: /[가-힯]/u,
  ja: /[぀-ヿ一-鿿]/u,
  'zh-CN': /[一-鿿]/u,
  hi: /[ऀ-ॿ]/u,
  bn: /[ঀ-৿]/u,
  th: /[฀-๿]/u,
  ar: /[؀-ۿ]/u,
  ur: /[؀-ۿ]/u,
  ru: /[Ѐ-ӿ]/u,
  uk: /[Ѐ-ӿ]/u,
}

/**
 * 그 로케일에 **있어서는 안 되는** 문자 체계.
 *
 * 데바나가리에서 U+0964 단다·U+0965 이중단다는 뺀다. 그 블록에 있지만
 * 벵골어 등 인도계 문자권이 **공용으로 쓰는 구두점**이라, 빼지 않으면 bn 이
 * 통째로 오탐난다. 실제로 그랬다.
 */
const FOREIGN: readonly {
  readonly name: string
  readonly re: RegExp
  readonly ok: readonly Locale[]
}[] = [
  { name: 'Cyrillic', re: /[Ѐ-ӿ]/u, ok: ['ru', 'uk'] },
  { name: 'Hangul', re: /[가-힯]/u, ok: ['ko'] },
  { name: 'Thai', re: /[฀-๿]/u, ok: ['th'] },
  { name: 'Arabic', re: /[؀-ۿ]/u, ok: ['ar', 'ur'] },
  { name: 'Devanagari', re: /[ऀ-ॣ०-ॿ]/u, ok: ['hi'] },
  { name: 'Bengali', re: /[ঀ-৿]/u, ok: ['bn'] },
  { name: 'Kana', re: /[぀-ヿ]/u, ok: ['ja'] },
]

const PAIRS = [
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
  ['“', '”'],
  ['「', '」'],
] as const

/** 제어문자와 U+FFFD 치환문자 — 인코딩이 깨졌다는 신호다 */
const BROKEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/u

/**
 * 언어를 몰라도 잡을 수 있는 오류.
 *
 * 19개 언어를 눈으로 교정할 방법은 없다. 그래도 사람이 실제로 가장 많이 내는
 * 실수는 여기 있다 — 붙여넣다 남은 공백, 닫지 않은 괄호, 두 번 들어간 단어.
 */
function formatIssues(v: string): string[] {
  const out: string[] = []
  if (v !== v.trim()) out.push('앞뒤 공백')
  if (/ {2,}/u.test(v)) out.push('연속 공백')
  if (/\s[,.;:!?]/u.test(v)) out.push('구두점 앞 공백')
  if (v.trim().length === 0) out.push('빈 값')

  for (const [open, close] of PAIRS) {
    if (v.split(open).length !== v.split(close).length) {
      out.push(`괄호 불일치 ${open}${close}`)
    }
  }

  // 같은 단어가 붙어서 두 번. 띄어쓰기가 있는 문자 체계에서만 의미가 있다
  if (/\b(\p{L}{3,})\s+\1\b/iu.test(v)) out.push('단어 중복')
  if (BROKEN.test(v)) out.push('제어·치환 문자')
  // 줄바꿈·탭이 문구에 들어갈 이유가 없다 — 레이아웃은 CSS 가 한다
  if (/[\r\n\t]/u.test(v)) out.push('줄바꿈·탭')
  return out
}

interface Row {
  readonly locale: Locale
  readonly key: string
  readonly value: string
}

/** 두 사전을 평탄화한다. err 는 중첩이라 err.CODE 로 편다 */
function rowsOf(locale: Locale): Row[] {
  const out: Row[] = []
  const push = (prefix: string, obj: Readonly<Record<string, unknown>>) => {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string') out.push({ locale, key: prefix + k, value: v })
      else if (v !== null && typeof v === 'object') {
        push(`${prefix}${k}.`, v as Record<string, unknown>)
      }
    }
  }
  push('copy.', copyFor(locale) as unknown as Record<string, unknown>)
  push('landing.', landingFor(locale) as unknown as Record<string, unknown>)
  return out
}

function readBaseline(): string[] {
  try {
    return JSON.parse(readFileSync(BASELINE, 'utf8')) as string[]
  } catch {
    return []
  }
}

const en = new Map(rowsOf('en').map((r) => [r.key, r.value]))
const write = process.argv.includes('--write')
const allowed = new Set(readBaseline())
const used = new Set<string>()
const problems: string[] = []
const fresh: string[] = []

const note = (locale: string, key: string, what: string, value: string): void => {
  problems.push(`  ${locale.padEnd(6)} ${key.padEnd(28)} ${what}: "${value}"`)
}

// 영어 원문도 서식은 본다. 원문이 깨져 있으면 19개 번역이 같이 깨진다.
for (const { key, value } of rowsOf('en')) {
  for (const issue of formatIssues(value)) note('en', key, issue, value)
}

for (const locale of LOCALES) {
  if (locale === 'en') continue
  const rows = rowsOf(locale)

  for (const { key, value } of rows) {
    const id = `${locale}:${key}`

    if (en.get(key) === value) {
      if (allowed.has(id)) used.add(id)
      else {
        fresh.push(id)
        note(locale, key, '영어 그대로', value)
      }
    }

    for (const f of FOREIGN) {
      if (f.ok.includes(locale)) continue
      if (f.re.test(value)) {
        note(locale, key, `${f.name} 문자 혼입`, value)
        break
      }
    }

    for (const issue of formatIssues(value)) note(locale, key, issue, value)
  }

  const re = SCRIPT[locale]
  if (re !== undefined && !rows.some((r) => re.test(r.value))) {
    problems.push(`  ${locale.padEnd(6)} ${'<전체>'.padEnd(28)} 고유 문자가 하나도 없다`)
  }
}

if (write) {
  const next = [...new Set([...allowed, ...fresh])].sort()
  writeFileSync(BASELINE, `${JSON.stringify(next, null, 2)}\n`)
  console.log(`copy: baseline 갱신 — ${next.length} 건`)
  process.exit(0)
}

// 쓰이지 않는 등재 항목도 실패시킨다 — 목록이 조용히 불어나는 것을 막는다
for (const s of [...allowed].filter((x) => !used.has(x))) {
  problems.push(`  ${s} — baseline 에 있으나 더는 해당 없음`)
}

if (problems.length > 0) {
  console.error('copy: 문제 발견\n')
  console.error(problems.join('\n'))
  console.error('\n영어와 같은 값이 정당하다면 `pnpm copy:check --write` 로 등재하라.')
  process.exit(1)
}

const rtl = LOCALES.filter((l) => LOCALE_INFO[l].dir === 'rtl')
console.log(
  `copy: ok — ${LOCALES.length} 로케일 × ${en.size} 문구, ` +
    `영어 폴백 ${allowed.size} 건(등재됨), RTL ${rtl.join(' ')}`,
)
