/**
 * 프로파일 게이트 — 07 합격 기준 1.
 *
 * 모든 프로파일을 세 등록소(라벨 · 렌더러 필드 · 아이콘)를 주입해 컴파일한다.
 * 하나라도 실패하면 CI 가 막는다. 런타임에 발견하면 이미 늦다.
 */
import { compileAllProfiles } from '@preflight/testkit'

let profiles
try {
  profiles = compileAllProfiles()
} catch (e) {
  console.error(`\nprofiles: 컴파일 실패\n  ${(e as Error).message}\n`)
  process.exit(1)
}

const rows = profiles.map((p) => {
  const axes = p.blocks
    .filter((b) => b.config.kind === 'PAIRWISE')
    .reduce((n, b) => n + (b.config.kind === 'PAIRWISE' ? b.config.axes.length : 0), 0)
  const rehearsal = p.blocks.some((b) => b.config.kind === 'REHEARSAL') ? 'rehearsal' : '—'
  return `  ${p.slug.padEnd(8)} ${p.reversibility.padEnd(8)} axes=${String(axes).padEnd(3)} blocks=${String(p.blocks.length).padEnd(3)} ${rehearsal}`
})

console.log(`profiles: ok — ${profiles.length} compiled\n${rows.join('\n')}`)
