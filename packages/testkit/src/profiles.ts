/**
 * 프로파일 로더.
 *
 * core 는 순수 TS 라 파일을 읽지 않는다. 디스크 접근은 여기서 한다.
 * 컴파일에 필요한 세 가지 등록소(라벨·렌더러 필드·아이콘)를 전부 주입하므로,
 * 이 로더를 통과한 프로파일은 07 합격 기준 1을 만족한 것이다.
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

/** 데이터만 있는 디렉터리. 여기에 .ts 가 생기면 07 합격 기준 2가 깨진 것이다. */
export const PROFILES_DIR = fileURLToPath(new URL('../../profiles/data/', import.meta.url))
export const LOCALES_DIR = fileURLToPath(new URL('../../core/locales/', import.meta.url))

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
