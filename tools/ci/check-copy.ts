/**
 * 문구 검사 — 20개 로케일이 **실제로** 번역돼 있는지 본다.
 *
 * 타입은 "키가 다 있는가" 까지만 본다. 값이 영어 그대로여도 통과한다.
 * 로케일이 20종이 되면 그 구멍이 곧 제품의 구멍이 된다 — 화면은 멀쩡히 뜨는데
 * 우르두어 사용자가 영어 문장을 읽게 되고, 아무도 알아채지 못한다.
 *
 * 두 가지를 본다.
 *
 *   1. 영어 폴백    비영어 로케일의 값이 영어와 같으면 실패.
 *                  정당한 경우가 있다 ("Email", "Console", "SEO") — 그건
 *                  baseline 에 **명시적으로** 등재해야 한다. 무언어 검사와
 *                  같은 규칙이다: 예외가 가장 쉬운 해결책이 되면 검사가 죽는다.
 *
 *   2. 문자 체계    태국어 값에 키릴 문자가 섞이는 식의 오염. 사람 눈으로는
 *                  거의 안 보인다 — "บรีф" 의 ф 는 키릴이다. 실제로 나왔다.
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

/** 로케일별로 기대하는 문자 체계. 라틴은 어디서나 허용한다 (차용어) */
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

/** 그 로케일에 **있어서는 안 되는** 문자 체계 */
const FOREIGN: readonly { readonly name: string; readonly re: RegExp; readonly ok: readonly Locale[] }[] = [
  { name: 'Cyrillic', re: /[Ѐ-ӿ]/u, ok: ['ru', 'uk'] },
  { name: 'Hangul', re: /[가-힯]/u, ok: ['ko'] },
  { name: 'Thai', re: /[฀-๿]/u, ok: ['th'] },
  { name: 'Arabic', re: /[؀-ۿ]/u, ok: ['ar', 'ur'] },
  // U+0964 단다·U+0965 이중단다는 데바나가리 블록에 있지만 벵골어·구자라트어 등
  // 인도계 문자권이 **공용으로 쓰는 구두점**이다. 빼지 않으면 bn 이 통째로 오탐난다.
  { name: 'Devanagari', re: /[ऀ-ॣ०-ॿ]/u, ok: ['hi'] },
  { name: 'Bengali', re: /[ঀ-৿]/u, ok: ['bn'] },
  { name: 'Kana', re: /[぀-ヿ]/u, ok: ['ja'] },
]

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
      else if (v !== null && typeof v === 'object') push(`${prefix}${k}.`, v as Record<string, unknown>)
    }
  }
  push('copy.', copyFor(locale) as unknown as Record<string, unknown>)
  push('landing.', landingFor(locale) as unknown as Record<string, unknown>)
  return out
}

const en = new Map(rowsOf('en').map((r) => [r.key, r.value]))

const write = process.argv.includes('--write')
const baseline: string[] = existsBaseline()
const allowed = new Set(baseline)
const used = new Set<string>()
const problems: string[] = []
const fresh: string[] = []

function existsBaseline(): string[] {
  try {
    return JSON.parse(readFileSync(BASELINE, 'utf8')) as string[]
  } catch {
    return []
  }
}

for (const locale of LOCALES) {
  if (locale === 'en') continue
  for (const { key, value } of rowsOf(locale)) {
    const id = `${locale}:${key}`

    // 1. 영어 폴백
    if (en.get(key) === value) {
      if (allowed.has(id)) used.add(id)
      else {
        fresh.push(id)
        problems.push(`  ${locale.padEnd(6)} ${key.padEnd(28)} 영어 그대로: "${value}"`)
      }
    }

    // 2. 문자 체계 오염
    for (const f of FOREIGN) {
      if (f.ok.includes(locale)) continue
      if (f.re.test(value)) {
        problems.push(`  ${locale.padEnd(6)} ${key.padEnd(28)} ${f.name} 문자 혼입: "${value}"`)
        break
      }
    }
  }

  // 3. 그 로케일의 고유 문자가 아예 안 보이면 통째로 번역이 빠진 것이다
  const re = SCRIPT[locale]
  if (re !== undefined && !rowsOf(locale).some((r) => re.test(r.value))) {
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
const stale = [...allowed].filter((x) => !used.has(x))
for (const s of stale) problems.push(`  ${s} — baseline 에 있으나 더는 해당 없음`)

if (problems.length > 0) {
  console.error('copy: 문제 발견\n')
  console.error(problems.join('\n'))
  console.error(
    '\n영어와 같은 값이 정당하다면 `pnpm copy:check --write` 로 baseline 에 등재하라.',
  )
  process.exit(1)
}

const rtl = LOCALES.filter((l) => LOCALE_INFO[l].dir === 'rtl')
console.log(
  `copy: ok — ${LOCALES.length} 로케일 × ${en.size} 문구, 영어 폴백 ${allowed.size} 건(등재됨), RTL ${rtl.join(' ')}`,
)
