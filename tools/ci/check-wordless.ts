/**
 * G-5 게이트 — 07 합격 기준 5.
 *
 * 클라이언트 화면 DOM 에 문장 노드가 0개인지 본다.
 * M1 에서 대상이 픽스처에서 실제 화면 컴포넌트로 교체된다.
 */
import { CLIENT_SCREENS, formatViolations, loadExemptions, scanWordless } from '@preflight/testkit'

const exemptions = loadExemptions()
const { violations, usedExemptions } = scanWordless(CLIENT_SCREENS, exemptions)

if (violations.length > 0) {
  console.error(`\nwordless: ${violations.length} violation(s)\n`)
  console.error(formatViolations(violations))
  console.error('')
  process.exit(1)
}

console.log(
  `wordless: ok — ${CLIENT_SCREENS.length} screen(s), ` +
    `${usedExemptions.length}/${exemptions.length} exemption(s) in use`,
)
