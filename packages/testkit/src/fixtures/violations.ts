/**
 * 의도적 위반 픽스처.
 *
 * 통과만 확인한 CI 게이트는 작동을 증명하지 않는다 (12 §11 Day 1-5).
 * 이 픽스처들은 검사기가 실제로 막는지를 고정한다.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Exemption, Screen } from '../wordless.ts'

export const VIOLATION_SCREENS: readonly Screen[] = [
  {
    id: 'X-sentence',
    html: `<section data-screen="X-sentence"><p>Pick the one you prefer</p></section>`,
  },
  {
    id: 'X-period',
    html: `<section data-screen="X-period"><p>Saved.</p></section>`,
  },
  {
    id: 'X-quote-warning',
    html: `<section data-screen="X-quote-warning"><p>This will require a new quote</p></section>`,
  },
  {
    id: 'X-unregistered-exempt',
    html: `<section data-screen="X-unregistered-exempt" data-wordless-exempt="i-just-added-this">
             <p>Your selections have been saved successfully</p>
           </section>`,
  },
]

export const BASELINE_PATH = fileURLToPath(
  new URL('../../../../tools/ci/wordless-baseline.json', import.meta.url),
)

/** 등재소는 파일 하나다. 테스트와 CI 가 같은 파일을 본다. */
export function loadExemptions(path: string = BASELINE_PATH): readonly Exemption[] {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as { exemptions?: Exemption[] }
  return raw.exemptions ?? []
}

export const EXEMPTIONS: readonly Exemption[] = loadExemptions()

/** 쓰이지 않는 등재 항목도 실패해야 한다 — 목록이 조용히 불어나는 것을 막는다. */
export const STALE_EXEMPTIONS: readonly Exemption[] = [
  ...EXEMPTIONS,
  { id: 'nobody-uses-this', screen: 'C-99', reason: '남아 있는 예외' },
]
