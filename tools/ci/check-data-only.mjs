/**
 * 07 합격 기준 2 — "image 렌더러로 새 유형 추가 시 코드 변경 0줄".
 *
 * 커밋 메시지가 `profile:` 로 시작하면 그 커밋에 .ts/.tsx 가 섞여 있으면 안 된다.
 * 판정이 커밋 diff 로 이뤄지므로 저장소가 없으면 M0 는 판정 불가 상태가 된다
 * — git init 이 Day 1 첫 항목인 이유다.
 *
 *   node tools/ci/check-data-only.mjs           HEAD 검사
 *   node tools/ci/check-data-only.mjs <ref>     특정 커밋 검사
 */
import { execFileSync } from 'node:child_process'

const ref = process.argv[2] ?? 'HEAD'

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

let subject
try {
  subject = git('log', '-1', '--format=%s', ref)
} catch {
  console.error(`data-only: ${ref} 를 읽을 수 없다.`)
  process.exit(1)
}

if (!subject.startsWith('profile:')) {
  console.log(`data-only: skip — "${subject}" 는 profile: 커밋이 아니다`)
  process.exit(0)
}

const parents = git('rev-list', '--parents', '-n', '1', ref).split(/\s+/u)
const files =
  parents.length > 1
    ? git('diff', '--name-only', `${ref}^`, ref).split('\n').filter(Boolean)
    : git('show', '--pretty=', '--name-only', ref).split('\n').filter(Boolean)

const code = files.filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/u.test(f))

if (code.length > 0) {
  console.error(`\ndata-only: profile: 커밋에 코드 변경이 섞였다 (${code.length}개)\n`)
  for (const f of code) console.error(`  ${f}`)
  console.error('\n새 거래 유형은 데이터로만 추가되어야 한다. 02 §4.1 · 07 합격 기준 2\n')
  process.exit(1)
}

console.log(`data-only: ok — ${files.length} file(s), 코드 변경 0`)
