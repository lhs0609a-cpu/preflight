/**
 * Zod 단일 소스 → JSON Schema 생성 — 07 합격 기준 1.
 *
 * TS 타입과 JSON Schema 를 손으로 두 벌 관리하면 반드시 어긋난다.
 * 생성물은 커밋되며, CI 는 재생성 결과와 diff 가 나면 실패시킨다.
 *
 *   pnpm schema:generate   재생성
 *   pnpm schema:check      diff 검사 (CI)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { ProfileSourceSchema } from '@preflight/core'

const OUT = fileURLToPath(new URL('../../packages/profiles/profile.schema.json', import.meta.url))

const schema = zodToJsonSchema(ProfileSourceSchema, {
  name: 'ProfileSource',
  $refStrategy: 'root',
})

const json = `${JSON.stringify(schema, null, 2)}\n`
const check = process.argv.includes('--check')

if (check) {
  let current: string
  try {
    current = readFileSync(OUT, 'utf8')
  } catch {
    console.error('schema: profile.schema.json 이 없다. pnpm schema:generate 를 실행하라.')
    process.exit(1)
  }
  if (current !== json) {
    console.error('schema: profile.schema.json 이 Zod 소스와 어긋난다.')
    console.error('        pnpm schema:generate 후 커밋하라.')
    process.exit(1)
  }
  console.log('schema: ok')
} else {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, json, 'utf8')
  console.log(`schema: wrote ${OUT}`)
}
