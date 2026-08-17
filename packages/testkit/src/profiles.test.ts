import { describe, expect, it } from 'vitest'
import { cardsOf, diffKeys, makePair, validateBundle } from '@preflight/core'
import { getRenderer, labelKeysIn, registerM0Renderers, toSvg } from '@preflight/render'
import { compileAllProfiles, loadLabelBundle, loadProfileSources } from './profiles.ts'
import { scanWordless } from './wordless.ts'

registerM0Renderers()

const profiles = compileAllProfiles()
const bySlug = new Map(profiles.map((p) => [p.slug, p]))

describe('프로파일 3종 — 07 합격 기준 1', () => {
  // 목록을 하드코딩하면 유형을 추가할 때 이 파일(.ts)을 고쳐야 하고,
  // 그 순간 07 합격 기준 2가 깨진다. 전부 데이터에서 유도한다.

  it('디렉터리의 JSON 이 전부 컴파일된다', () => {
    expect(profiles).toHaveLength(loadProfileSources().length)
    expect(profiles.length).toBeGreaterThanOrEqual(3)
    expect(profiles.every((p) => p.slug.length > 0)).toBe(true)
  })

  it('reversibility 세 값이 전부 덮인다', () => {
    const covered = new Set(profiles.map((p) => p.reversibility))
    expect([...covered].sort()).toEqual(['cheap', 'gated', 'outcome'])
  })

  it('리허설은 gated 에만, 그리고 gated 에는 반드시 들어간다', () => {
    for (const p of profiles) {
      const hasRehearsal = p.flow.includes('rehearsal')
      expect(hasRehearsal, `${p.slug} (${p.reversibility})`).toBe(p.reversibility === 'gated')
    }
  })

  it('PNR 차단은 gated 에서만 켜지고, 켜지면 한계점 키가 있다', () => {
    for (const p of profiles) {
      expect(p.policy.pnr === 'blocking', p.slug).toBe(p.reversibility === 'gated')
      if (p.policy.pnr === 'blocking') {
        expect(p.policy.pointOfNoReturnKey, p.slug).not.toBeNull()
      }
    }
  })

  it('v1 오픈 2종이 존재하고 정책 경로가 서로 반대다 (12 §1.2)', () => {
    expect(bySlug.get('web')?.reversibility).toBe('cheap')
    expect(bySlug.get('photo')?.reversibility).toBe('gated')
    expect(bySlug.get('photo')?.policy.pointOfNoReturnKey).toBe('pnr.shootend')
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
      let pairwiseBlocks = 0
      for (const block of profile.blocks) {
        const config = block.config
        if (config.kind !== 'PAIRWISE') continue
        pairwiseBlocks++
        for (const axis of config.axes) {
          const [a, b] = cardsOf(makePair(config.base, axis))
          expect(diffKeys(a, b), `${profile.slug}.${axis.nameKey}`).toEqual([axis.field])
          axisCount++
        }
      }
      // 취향 블록이 없으면 무언어 확정이 성립하지 않는다
      expect(pairwiseBlocks, profile.slug).toBeGreaterThanOrEqual(1)
    }
    expect(axisCount).toBeGreaterThanOrEqual(3 * profiles.length)
  })

  it('모든 measure 가 채워져 있다 (L-3)', () => {
    for (const profile of profiles) {
      for (const block of profile.blocks) {
        const config = block.config
        if (config.kind !== 'PAIRWISE') continue
        for (const axis of config.axes) {
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
        const config = block.config
        if (config.kind !== 'PAIRWISE') continue
        const renderer = getRenderer(config.renderer)
        for (const axis of config.axes) {
          for (const card of cardsOf(makePair(config.base, axis))) {
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
        const config = block.config
        if (config.kind !== 'PAIRWISE') continue
        const renderer = getRenderer(config.renderer)
        for (const axis of config.axes) {
          const [a, b] = cardsOf(makePair(config.base, axis))
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
