/**
 * 무언어 검사 대상 — **실제 컴포넌트**.
 *
 * M0 에서는 손으로 쓴 HTML 픽스처를 봤다. 그 검사는 픽스처가 정직한 동안에만
 * 의미가 있다. 이제 진짜 화면을 렌더해서 본다 — 프로파일 4종 × 화면 6종 ×
 * 축마다의 카드 전부.
 *
 * 문장이 하나라도 새어 들어가면 여기서 CI 가 멈춘다 (G-5 · 07 합격 기준 5).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import {
  compileSpec,
  composedValues,
  linesFromChoices,
  progressOf,
  serializedPairAt,
  totalsOf,
  type BlockConfig,
  type CompiledProfile,
  type Side,
} from '@preflight/core'
import { registerM0Renderers, renderCard } from '@preflight/render'
import {
  Done,
  LinkEntry,
  ScopeAssemble,
  SpecConfirm,
  StructurePick,
  TasteCards,
} from '@preflight/ui'
import type { Screen } from '../wordless.ts'
import { compileAllProfiles, loadLabelBundle } from '../profiles.ts'

registerM0Renderers()

const dict = loadLabelBundle().en

const html = (id: string, node: React.ReactNode): Screen => ({
  id,
  html: renderToStaticMarkup(node),
})

const blockWith = (p: CompiledProfile, kind: BlockConfig['kind'], mode?: 'scope' | 'assets') =>
  p.blocks.find(
    (b) =>
      b.config.kind === kind &&
      (mode === undefined || (b.config.kind === 'CHECKLIST' && b.config.mode === mode)),
  )

function screensFor(profile: CompiledProfile): Screen[] {
  const out: Screen[] = [
    html(`${profile.slug}/C-01`, <LinkEntry steps={profile.flow.length} avatarUrl="/a.webp" />),
  ]

  const taste = blockWith(profile, 'PAIRWISE')
  if (taste && taste.config.kind === 'PAIRWISE') {
    const config = taste.config
    const { total } = progressOf(config, 0)

    // C-02 — 모든 축의 카드를 본다. 한 축이라도 문장을 그리면 걸린다.
    for (let cursor = 0; cursor < total; cursor++) {
      const pair = serializedPairAt(config, cursor)!
      out.push(
        html(
          `${profile.slug}/C-02[${pair.axisKey}]`,
          <TasteCards pair={pair} cursor={cursor} total={total} canBack={cursor > 0} />,
        ),
      )
    }

    // C-03 — 전 축 확정 후 합성 미리보기
    const choices: Side[] = Array.from({ length: total }, (_, i) => (i % 2 === 0 ? 'a' : 'b'))
    out.push(
      html(
        `${profile.slug}/C-03`,
        <SpecConfirm
          lines={linesFromChoices(config, choices)}
          dict={dict}
          preview={renderCard(config.renderer, composedValues(config, choices), { w: 240, h: 180 })}
        />,
      ),
    )

    // C-10 — 완료
    const totals = totalsOf(profile, {})
    const spec = compileSpec(profile, {
      no: 'PF-2609-0142',
      outputs: [
        {
          blockId: taste.id,
          lines: linesFromChoices(config, choices),
          lockedAt: null,
          amountDeltaUsd: 0,
          daysDelta: 0,
        },
      ],
      amountUsd: totals.amountUsd,
      weeks: totals.weeks,
      revisions: totals.revisions,
      lockedAt: '2026-09-02T00:00:00.000Z',
    })
    out.push(html(`${profile.slug}/C-10`, <Done spec={spec} dict={dict} />))
  }

  const structure = blockWith(profile, 'PICK_N')
  if (structure && structure.config.kind === 'PICK_N') {
    out.push(
      html(
        `${profile.slug}/C-05`,
        <StructurePick config={structure.config} dict={dict} selected={1} />,
      ),
    )
  }

  const scope = blockWith(profile, 'CHECKLIST', 'scope')
  if (scope && scope.config.kind === 'CHECKLIST') {
    const totals = totalsOf(profile, {})
    out.push(
      html(
        `${profile.slug}/C-07`,
        <ScopeAssemble
          config={scope.config}
          dict={dict}
          amountUsd={totals.amountUsd}
          weeks={totals.weeks}
        />,
      ),
    )
  }

  return out
}

export const CLIENT_SCREENS: readonly Screen[] = compileAllProfiles().flatMap(screensFor)
