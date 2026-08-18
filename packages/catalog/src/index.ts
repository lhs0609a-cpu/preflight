/**
 * 카탈로그 로더 — 디스크의 프로파일·로케일을 읽어 컴파일한다.
 *
 * core 는 순수 TS 라 파일을 읽지 않는다. 디스크 접근은 여기서만 한다.
 * 컴파일에 필요한 세 등록소(라벨 · 렌더러 필드 · 아이콘)를 전부 주입하므로,
 * 이 로더를 통과한 프로파일은 07 합격 기준 1을 만족한 것이다.
 *
 * 서버 전용이다. 앱과 테스트가 같은 로더를 쓴다 — 두 벌이면 어긋난다.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  LOCALES,
  bundleKeys,
  compileProfile,
  type CompiledProfile,
  type Dictionary,
  type LabelBundle,
  type Locale,
} from '@preflight/core'
import { ICONS, getRenderer, hasRenderer, registerM0Renderers } from '@preflight/render'

// new URL(..., import.meta.url) 을 쓰지 않는다 — 번들러가 그것을 모듈 참조로
// 해석해 빌드가 깨진다. 디렉터리는 이 파일 위치에서 계산한다.
const HERE = path.dirname(fileURLToPath(import.meta.url))

/** 데이터만 있는 디렉터리. 여기에 .ts 가 생기면 07 합격 기준 2가 깨진 것이다. */
export const PROFILES_DIR = path.resolve(HERE, '../../profiles/data')
export const LOCALES_DIR = path.resolve(HERE, '../../core/locales')

export function loadLabelBundle(): LabelBundle {
  const entries = LOCALES.map((locale): [Locale, Dictionary] => {
    const file = path.join(LOCALES_DIR, `${locale}.json`)
    return [locale, JSON.parse(readFileSync(file, 'utf8')) as Dictionary]
  })
  return Object.fromEntries(entries) as LabelBundle
}

export interface ProfileFile {
  readonly file: string
  readonly source: unknown
}

export function loadProfileSources(): ProfileFile[] {
  return readdirSync(PROFILES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({
      file: f,
      source: JSON.parse(readFileSync(path.join(PROFILES_DIR, f), 'utf8')) as unknown,
    }))
}

const ICON_SET: ReadonlySet<string> = new Set(ICONS)

export function compileAllProfiles(): CompiledProfile[] {
  registerM0Renderers()
  const labelKeys = bundleKeys(loadLabelBundle())
  return loadProfileSources().map(({ source }) =>
    compileProfile(source, {
      labelKeys,
      iconKeys: ICON_SET,
      rendererFields: (id) => (hasRenderer(id) ? getRenderer(id).fields : undefined),
    }),
  )
}
