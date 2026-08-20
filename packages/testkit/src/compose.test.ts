/**
 * composedWith — C-04 역제안 비교의 두 카드를 만드는 함수.
 *
 * 실제 프로파일로 돈다. 픽스처를 따로 만들면 "테스트는 통과하는데 앱은
 * 깨지는" 상태가 생긴다.
 *
 * 핵심 불변식은 "오버라이드가 composedValues 와 한 필드만 다르다" 가 **아니다.**
 * image 렌더러 프로파일(seo · print)은 전 축이 같은 `src` 필드를 쓴다 —
 * 축마다 이미지 한 장을 통째로 갈아끼우는 구조라, composedValues 는 마지막 축의
 * 이미지만 남는다. 거기에 오버라이드를 걸면 무관한 두 장이 나란히 뜬다.
 *
 * 그래서 C-04 는 **양쪽 카드를 모두 composedWith 로** 만든다. 그러면 두 카드가
 * 같은 방식으로 조립되므로 렌더러 종류와 무관하게 정확히 한 필드만 다르다.
 * C-02 의 "두 카드는 한 축만 다르다" 불변식이 C-04 에서도 유지된다.
 */
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { composedValues, composedWith, type BlockConfig, type Side } from '@preflight/core'
import { compileAllProfiles } from './profiles.ts'

const profiles = compileAllProfiles()

/** 전 프로파일의 PAIRWISE 블록. 유형이 늘어도 이 목록이 따라 는다 */
const pairwise = profiles.flatMap((p) =>
  p.blocks
    .map((b) => b.config)
    .filter((c): c is Extract<BlockConfig, { kind: 'PAIRWISE' }> => c.kind === 'PAIRWISE')
    .map((config) => ({ slug: p.slug, config })),
)

const sides = (n: number): fc.Arbitrary<Side[]> =>
  fc.array(fc.constantFrom<Side>('a', 'b'), { minLength: n, maxLength: n })

const changedKeys = (
  x: Readonly<Record<string, unknown>>,
  y: Readonly<Record<string, unknown>>,
): string[] =>
  [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(
    (k) => JSON.stringify(x[k]) !== JSON.stringify(y[k]),
  )

describe('composedWith — C-04 의 두 카드는 한 축만 다르다', () => {
  it('검사할 PAIRWISE 블록이 있다', () => {
    expect(pairwise.length).toBeGreaterThan(0)
  })

  it('전 축이 같은 필드를 쓰는 프로파일이 실제로 있다 — 이 테스트가 지키는 것이 그 경우다', () => {
    const shared = pairwise.filter(
      ({ config }) => new Set(config.axes.map((a) => a.field)).size < config.axes.length,
    )
    expect(shared.length).toBeGreaterThan(0)
  })

  for (const { slug, config } of pairwise) {
    describe(slug, () => {
      /**
       * C-04 가 실제로 하는 일. 같은 축의 두 값을 각각 넣어 카드를 만든다.
       * 렌더러가 무엇이든 결과는 그 축의 필드 하나만 달라야 한다.
       */
      it('같은 축의 두 값으로 만든 카드는 그 축의 필드에서만 다르다', () => {
        fc.assert(
          fc.property(
            sides(config.axes.length),
            fc.integer({ min: 0, max: config.axes.length - 1 }),
            (choices, i) => {
              const axis = config.axes[i]!
              const chosen = choices[i]!
              const other: Side = chosen === 'a' ? 'b' : 'a'

              const current = composedWith(config, choices, {
                axisKey: axis.nameKey,
                value: axis[chosen].value,
              })
              const proposed = composedWith(config, choices, {
                axisKey: axis.nameKey,
                value: axis[other].value,
              })

              // 축은 양극이 다름이 보장돼 있다 (assertAxisValid 의 AXIS_NO_CONTRAST)
              expect(changedKeys(current, proposed)).toEqual([axis.field])
            },
          ),
          { numRuns: 60 },
        )
      })

      it('제안값이 그 축의 필드에 그대로 들어간다', () => {
        const choices: Side[] = config.axes.map(() => 'a')
        for (const axis of config.axes) {
          const out = composedWith(config, choices, { axisKey: axis.nameKey, value: axis.b.value })
          expect(out[axis.field]).toEqual(axis.b.value)
        }
      })

      it('축 필드가 서로 다른 프로파일에서는 composedValues 와도 한 필드만 다르다', () => {
        const distinct = new Set(config.axes.map((a) => a.field)).size === config.axes.length
        if (!distinct) return
        const choices: Side[] = config.axes.map(() => 'a')
        const axis = config.axes[0]!
        const out = composedWith(config, choices, { axisKey: axis.nameKey, value: axis.b.value })
        expect(changedKeys(composedValues(config, choices), out)).toEqual([axis.field])
      })

      it('오버라이드는 한 축만 받는다 — 호출 하나로 두 축을 바꿀 경로가 없다', () => {
        const choices: Side[] = config.axes.map(() => 'a')
        const axis = config.axes[0]!
        const out = composedWith(config, choices, { axisKey: axis.nameKey, value: axis.b.value })
        const base = composedWith(config, choices, { axisKey: axis.nameKey, value: axis.a.value })
        expect(changedKeys(base, out).length).toBeLessThanOrEqual(1)
      })
    })
  }

  it('없는 축이면 던진다 — 조용히 무시하면 의미 없는 비교 화면이 뜬다', () => {
    const { config } = pairwise[0]!
    expect(() =>
      composedWith(
        config,
        config.axes.map(() => 'a'),
        { axisKey: 'nope', value: 1 },
      ),
    ).toThrow(/AXIS_NOT_FOUND/)
  })

  it('결과가 얼어 있다 — 렌더러가 실수로 고쳐도 원본이 안 흔들린다', () => {
    const { config } = pairwise[0]!
    const axis = config.axes[0]!
    const out = composedWith(
      config,
      config.axes.map(() => 'a'),
      { axisKey: axis.nameKey, value: axis.b.value },
    )
    expect(Object.isFrozen(out)).toBe(true)
  })
})
