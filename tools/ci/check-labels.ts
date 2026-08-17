/**
 * 라벨 번들 검사 — NFR-1.2 · 02 §2 L-2 · 12 §6.4.
 *
 * 영어로 2단어여도 힌디어로 6단어면 그 로케일에서 무언어 원칙이 깨진다.
 * 한국어 사용자가 알아챌 방법이 없으므로 기계가 본다.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { LOCALES, validateBundle, type Dictionary, type LabelBundle, type Locale } from '@preflight/core'

const dir = new URL('../../packages/core/locales/', import.meta.url)

const bundle = Object.fromEntries(
  LOCALES.map((locale): [Locale, Dictionary] => {
    const path = fileURLToPath(new URL(`${locale}.json`, dir))
    try {
      return [locale, JSON.parse(readFileSync(path, 'utf8')) as Dictionary]
    } catch {
      console.error(`labels: ${locale}.json 이 없다.`)
      process.exit(1)
    }
  }),
) as LabelBundle

const issues = validateBundle(bundle)

if (issues.length > 0) {
  console.error(`\nlabels: ${issues.length} issue(s)\n`)
  for (const i of issues) {
    console.error(`  [${i.locale}] ${i.code} ${i.key}${i.detail ? ` — ${i.detail}` : ''}`)
  }
  console.error('')
  process.exit(1)
}

const keyCount = Object.keys(bundle.en).length
console.log(`labels: ok — ${keyCount} key(s) × ${LOCALES.length} locale(s), all ≤ 3 words`)
