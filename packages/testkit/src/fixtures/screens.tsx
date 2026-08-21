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
import { judge, type NegotiationView } from '@preflight/core'
import { registerM0Renderers, renderCard } from '@preflight/render'
import {
  AssetCheck,
  Done,
  Feedback,
  LinkEntry,
  NegotiationCompare,
  ScopeAssemble,
  SpecConfirm,
  PnrConfirm,
  StructurePick,
  TasteCards,
  TeamCompare,
  TonePick,
  Waiting,
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

  // C-06 은 style 이 sample 인 PICK_N 이다. 슬러그로 찾지 않는다.
  const tone = profile.blocks.find(
    (b) => b.config.kind === 'PICK_N' && b.config.style === 'sample',
  )
  if (tone && tone.config.kind === 'PICK_N') {
    out.push(html(`${profile.slug}/C-06`, <TonePick config={tone.config} selected={0} />))
  }

  // C-12 는 리허설 블록이 있는 유형(gated)에만 있다
  const rehearsal = profile.blocks.find((b) => b.config.kind === 'REHEARSAL')
  if (rehearsal && rehearsal.config.kind === 'REHEARSAL') {
    const n = rehearsal.config.checkpointKeys.length
    out.push(html(`${profile.slug}/C-12`, <PnrConfirm hoursLeft={36} passed={n} total={n} />))
    out.push(
      html(`${profile.slug}/C-12-held`, <PnrConfirm hoursLeft={36} passed={n} total={n} held />),
    )
  }

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

    // C-09 팀 대조. 축은 실제 프로파일에서 온다
    out.push(
      html(
        `${profile.slug}/C-09`,
        <TeamCompare
          members={3}
          dict={dict}
          rows={spec.lines.slice(0, 4).map((l, i) => ({
            axisKey: l.key,
            picks: [i % 2 === 0 ? 'a' : 'b', 'a', i > 1 ? 'b' : 'a'] as ('a' | 'b')[],
          }))}
          canInvite
        />,
      ),
    )
    // 04 §5.2 검토 대기. 화면이 없으면 게이지만 남은 빈 페이지가 뜬다
    out.push(
      html(
        `${profile.slug}/C-WAIT`,
        <Waiting locked={spec.lines.length} total={spec.lines.length} hoursLeft={18} />,
      ),
    )
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

  // C-04 — 역제안 비교. 근거 문장이 내려가지 않는지 여기서도 본다
  if (taste && taste.config.kind === 'PAIRWISE') {
    const config = taste.config
    const axis = config.axes[0]!
    const view: NegotiationView = {
      id: 'n1',
      axisKey: axis.nameKey,
      current: { labelKey: axis.a.labelKey, measure: axis.a.measure, value: axis.a.value },
      proposed: { labelKey: axis.b.labelKey, measure: axis.b.measure, value: axis.b.value },
      response: null,
    }
    out.push(
      html(
        `${profile.slug}/C-04`,
        <NegotiationCompare
          item={view}
          index={0}
          total={2}
          currentPreview={renderCard(config.renderer, { ...config.base, [axis.field]: axis.a.value }, { w: 150, h: 170 })}
          proposedPreview={renderCard(config.renderer, { ...config.base, [axis.field]: axis.b.value }, { w: 150, h: 170 })}
        />,
      ),
    )

    // C-11 — 피드백. 판정 결과 3종을 전부 렌더한다
    const axisKeys = config.axes.map((a) => a.nameKey)
    const cases = [
      { basis: 'off' as const },
      { basis: 'taste' as const },
      { basis: 'change' as const },
    ]
    for (const c of cases) {
      const verdict = judge(c, { used: 1, total: 3 }, { requoteUsd: 120, requoteDays: 2, outOfScopeUsd: 18 })
      out.push(
        html(
          `${profile.slug}/C-11[${c.basis}]`,
          <Feedback axisKeys={axisKeys} dict={dict} basis={c.basis} verdict={verdict} />,
        ),
      )
    }
  }

  // C-08 — 자료 체크
  const assets = blockWith(profile, 'CHECKLIST', 'assets')
  if (assets && assets.config.kind === 'CHECKLIST') {
    out.push(
      html(
        `${profile.slug}/C-08`,
        <AssetCheck
          config={assets.config}
          dict={dict}
          provided={1}
          total={assets.config.items.length}
          delayedDays={3}
        />,
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
