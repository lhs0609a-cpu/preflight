import { describe, expect, it } from 'vitest'
import { measure } from './measure.ts'
import { labelKey, t, validateBundle, type LabelBundle } from './i18n/labels.ts'

describe('measure — 02 §3', () => {
  it('카탈로그의 실제 measure 를 받아들인다', () => {
    for (const m of [
      'padding 32px',
      '#7E8F86 · 11%',
      'radius 0px',
      'avg 1.6s',
      'diffused 5200K',
      'one-touch bottom',
      'term(source)',
      '2 blocks',
    ]) {
      expect(() => measure(m)).not.toThrow()
    }
  })

  it('문장은 measure 가 아니다', () => {
    expect(() => measure('Make the spacing a little wider.')).toThrow(/MEASURE_/u)
  })

  it('빈 값은 거부', () => {
    expect(() => measure('   ')).toThrow(/MEASURE_EMPTY/u)
  })
})

describe('measure 는 번역 경로에 들어갈 수 없다', () => {
  it('t() 에 Measure 를 넘기면 컴파일 에러다', () => {
    const m = measure('padding 32px')
    const dict = { spacing: 'Spacing' }
    // @ts-expect-error Measure 는 LabelKey 브랜드가 아니므로 대입되지 않는다.
    const _bad = () => t(m, dict)
    expect(typeof _bad).toBe('function')
  })

  it('검증된 키만 LabelKey 가 된다', () => {
    const keys = new Set(['spacing'])
    expect(() => labelKey('spacing', keys)).not.toThrow()
    expect(() => labelKey('nope', keys)).toThrow(/LABEL_KEY_UNREGISTERED/u)
  })
})

describe('validateBundle — NFR-1.2', () => {
  const base = {
    ko: { spacing: '여백' },
    en: { spacing: 'Spacing' },
    hi: { spacing: 'स्पेसिंग' },
    tl: { spacing: 'Espasyo' },
    vi: { spacing: 'Khoảng cách' },
    uk: { spacing: 'Відступ' },
    es: { spacing: 'Espaciado' },
    'pt-BR': { spacing: 'Espaçamento' },
  } satisfies LabelBundle

  it('전 로케일이 갖춰지고 3단어 이내면 통과', () => {
    expect(validateBundle(base)).toEqual([])
  })

  it('한 로케일만 길어도 잡는다', () => {
    const bundle = { ...base, hi: { spacing: 'बहुत बहुत अधिक चौड़ा अंतर' } }
    const issues = validateBundle(bundle)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ code: 'TOO_LONG', locale: 'hi', key: 'spacing' })
  })

  it('누락된 로케일을 잡는다', () => {
    const bundle = { ...base, uk: {} }
    expect(validateBundle(bundle)).toEqual([
      { code: 'MISSING', locale: 'uk', key: 'spacing' },
    ])
  })
})
