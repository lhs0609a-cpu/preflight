import { describe, expect, it } from 'vitest'
import { cardsOf, diffKeys, makePair, validateBundle } from '@preflight/core'
import { getRenderer, labelKeysIn, registerM0Renderers, toSvg } from '@preflight/render'
import { compileAllProfiles, loadLabelBundle, loadProfileSources } from './profiles.ts'
import { scanWordless } from './wordless.ts'

registerM0Renderers()

const profiles = compileAllProfiles()
const bySlug = new Map(profiles.map((p) => [p.slug, p]))

describe('프로파일 3종 — 07 합격 기준 1', () => {
  it('JSON 만으로 로딩된다', () => {
    expect(profiles.map((p) => p.slug).sort()).toEqual(['photo', 'seo', 'web'])
  })

  it('reversibility 세 값을 전부 덮는다', () => {
    expect(bySlug.get('web')?.reversibility).toBe('cheap')
    expect(bySlug.get('photo')?.reversibility).toBe('gated')
    expect(bySlug.get('seo')?.reversibility).toBe('outcome')
  })

  it('gated 프로파일에만 리허설이 들어간다', () => {
    expect(bySlug.get('photo')?.flow).toContain('rehearsal')
    expect(bySlug.get('web')?.flow).not.toContain('rehearsal')
    expect(bySlug.get('seo')?.flow).not.toContain('rehearsal')
  })

  it('photo 는 촬영 종료를 되돌림 한계점으로 갖는다', () => {
    const photo = bySlug.get('photo')!
    expect(photo.policy.pnr).toBe('blocking')
    expect(photo.policy.pointOfNoReturnKey).toBe('pnr.shootend')
  })

  it('라벨 번들이 8개 로케일 × 3단어 이내를 만족한다', () => {
    expect(validateBundle(loadLabelBundle())).toEqual([])
  })

  it('프로파일 파일에 .ts 가 섞여 있지 않다', () => {
    expect(loadProfileSources().every((p) => p.file.endsWith('.json'))).toBe(true)
  })
})

describe('카탈로그 전수 — 합격 기준 3', () => {
  it('모든 프로파일의 모든 축에서 두 카드가 정확히 한 필드만 다르다', () => {
    let axisCount = 0
    for (const profile of profiles) {
      for (const block of profile.blocks) {
        if (block.config.kind !== 'PAIRWISE') continue
        for (const axis of block.config.axes) {
          const [a, b] = cardsOf(makePair(block.config.base, axis))
          expect(diffKeys(a, b), `${profile.slug}.${axis.nameKey}`).toEqual([axis.field])
          axisCount++
        }
      }
    }
    // web 6 + photo 5 + seo 4
    expect(axisCount).toBe(15)
  })

  it('모든 measure 가 채워져 있다 (L-3)', () => {
    for (const profile of profiles) {
      for (const block of profile.blocks) {
        if (block.config.kind !== 'PAIRWISE') continue
        for (const axis of block.config.axes) {
          expect(axis.a.measure.trim().length, `${profile.slug}.${axis.nameKey}.a`).toBeGreaterThan(0)
          expect(axis.b.measure.trim().length, `${profile.slug}.${axis.nameKey}.b`).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe('렌더러 3종', () => {
  it('모든 축이 렌더 트리를 만들고, 트리에 라벨 노드가 없다', () => {
    for (const profile of profiles) {
      for (const block of profile.blocks) {
        if (block.config.kind !== 'PAIRWISE') continue
        const renderer = getRenderer(block.config.renderer)
        for (const axis of block.config.axes) {
          for (const card of cardsOf(makePair(block.config.base, axis))) {
            const tree = renderer.render(card, { w: 240, h: 180 })
            // 02 §4.1 — 카드에 축 설명 라벨을 붙이면 재인 과제가 회상 과제가 된다
            expect(labelKeysIn(tree), `${profile.slug}.${axis.nameKey}`).toEqual([])
          }
        }
      }
    }
  })

  it('같은 입력이면 같은 트리다 (순수 함수)', () => {
    const web = getRenderer('web')
    const config = bySlug.get('web')!.blocks[0]!.config
    if (config.kind !== 'PAIRWISE') throw new Error('unexpected')
    const [card] = cardsOf(makePair(config.base, config.axes[0]!))
    expect(web.render(card, { w: 240, h: 180 })).toEqual(web.render(card, { w: 240, h: 180 }))
  })

  it('한 축만 다른 두 카드는 렌더 결과도 달라야 한다 — 축이 보이지 않으면 판별 불가', () => {
    for (const profile of profiles) {
      for (const block of profile.blocks) {
        if (block.config.kind !== 'PAIRWISE') continue
        const renderer = getRenderer(block.config.renderer)
        for (const axis of block.config.axes) {
          const [a, b] = cardsOf(makePair(block.config.base, axis))
          const sa = toSvg(renderer.render(a, { w: 240, h: 180 }), { w: 240, h: 180 })
          const sb = toSvg(renderer.render(b, { w: 240, h: 180 }), { w: 240, h: 180 })
          expect(sa, `${profile.slug}.${axis.nameKey}`).not.toEqual(sb)
        }
      }
    }
  })

  it('렌더된 카드 SVG 에 문장이 없다 (G-5)', () => {
    const screens = profiles.flatMap((profile) =>
      profile.blocks.flatMap((block) => {
        const config = block.config
        if (config.kind !== 'PAIRWISE') return []
        const renderer = getRenderer(config.renderer)
        return config.axes.flatMap((axis) =>
          cardsOf(makePair(config.base, axis)).map((card, i) => ({
            id: `${profile.slug}.${axis.nameKey}.${i}`,
            html: toSvg(renderer.render(card, { w: 240, h: 180 }), { w: 240, h: 180 }),
          })),
        )
      }),
    )
    expect(scanWordless(screens, []).violations).toEqual([])
  })
})
