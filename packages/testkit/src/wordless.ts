/**
 * 무언어 검사기 — G-5 · 06 §2.4 · 07 합격 기준 5.
 *
 * 렌더 트리 규격이 자유 텍스트 노드를 없애 대부분을 막지만(12 §6.1),
 * 화면 껍데기(HTML)는 여전히 사람이 쓴다. 여기서 잡는다.
 *
 * baseline lock 이 이 검사의 핵심이다.
 *   위반이 났을 때 가장 쉬운 해결책은 data-wordless-exempt 를 붙이는 것이다.
 *   그래서 예외는 파일에 등재해야 하고, 등재되지 않은 예외와
 *   더 이상 쓰이지 않는 등재 항목 **양쪽 다** 실패시킨다.
 */
import { JSDOM } from 'jsdom'

/** 06 §2.4 — 텍스트 노드 중 5단어 초과가 존재하면 실패 */
export const MAX_WORDS = 5

/** 텍스트를 담아도 화면에 문장으로 읽히지 않는 자리 */
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'TITLE', 'HEAD', 'DESC', 'METADATA'])

export interface Exemption {
  /** data-wordless-exempt 값 */
  readonly id: string
  readonly screen: string
  readonly reason: string
}

export type ViolationRule =
  | 'too-many-words'
  | 'sentence-punctuation'
  | 'sentence-shape'
  | 'unregistered-exemption'
  | 'stale-exemption'

export interface WordlessViolation {
  readonly screen: string
  readonly rule: ViolationRule
  readonly path: string
  readonly text: string
}

export interface Screen {
  readonly id: string
  readonly html: string
}

export interface ScanResult {
  readonly violations: readonly WordlessViolation[]
  readonly usedExemptions: readonly string[]
}

function pathOf(el: Element | null): string {
  const parts: string[] = []
  let cur: Element | null = el
  while (cur && cur.tagName !== 'BODY') {
    const id = cur.getAttribute('data-screen') ?? cur.id
    parts.unshift(id ? `${cur.tagName.toLowerCase()}#${id}` : cur.tagName.toLowerCase())
    cur = cur.parentElement
  }
  return parts.join('>')
}

function exemptIdFor(el: Element | null): string | null {
  let cur: Element | null = el
  while (cur) {
    const v = cur.getAttribute('data-wordless-exempt')
    if (v !== null) return v
    cur = cur.parentElement
  }
  return null
}

function skipped(el: Element | null): boolean {
  let cur: Element | null = el
  while (cur) {
    if (SKIP_TAGS.has(cur.tagName.toUpperCase())) return true
    cur = cur.parentElement
  }
  return false
}

export function wordsOf(text: string): string[] {
  const t = text.trim()
  return t.length === 0 ? [] : t.split(/\s+/u)
}

/** 종결 문장부호. "1.5MB" 처럼 숫자 사이의 점은 문장이 아니다. */
const SENTENCE_PUNCT = /[.?!](\s|$)/u

/**
 * 5단어 초과 규칙만으로는 부족하다.
 *
 * 06 §2.2 가 금지 예시로 든 "Pick the one you prefer" 는 정확히 5단어라
 * 단어 수 검사를 그대로 통과한다. 짧은 명령문·평서문이 그 틈으로 들어온다.
 *
 * 그래서 기능어 밀도를 함께 본다. 라벨과 수치에는 기능어가 거의 없고
 * (Spacing · 32px · 2 blocks · no hero · one-touch bottom),
 * 문장에는 반드시 둘 이상 들어간다
 * (Pick **the** one **you** prefer / **This will** require **a** new quote).
 *
 * 영어 기준이다. 클라이언트 화면에는 애초에 단어가 거의 없어야 하고,
 * 영문이 정당한 자리(C-06 톤 샘플)는 등재 예외로 처리된다.
 */
const FUNCTION_WORDS = new Set([
  'a', 'an', 'the',
  'and', 'or', 'but', 'if', 'then', 'so', 'than', 'as',
  'this', 'that', 'these', 'those', 'it', 'its',
  'you', 'your', 'we', 'our', 'they', 'their',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must',
  'have', 'has', 'had', 'do', 'does', 'did',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'from', 'by',
  'not', 'please', 'when', 'before', 'after', 'here', 'there',
])

const FUNCTION_WORD_LIMIT = 2

export function functionWordCount(text: string): number {
  return wordsOf(text).filter((w) => FUNCTION_WORDS.has(w.replace(/[^a-z']/giu, '').toLowerCase()))
    .length
}

export function scanWordless(
  screens: readonly Screen[],
  exemptions: readonly Exemption[],
  maxWords: number = MAX_WORDS,
): ScanResult {
  const violations: WordlessViolation[] = []
  const registered = new Set(exemptions.map((e) => e.id))
  const used = new Set<string>()

  for (const screen of screens) {
    const dom = new JSDOM(`<!doctype html><body>${screen.html}</body>`)
    const doc = dom.window.document
    const walker = doc.createTreeWalker(doc.body, dom.window.NodeFilter.SHOW_TEXT)

    for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
      const text = n.textContent ?? ''
      if (text.trim().length === 0) continue

      const el = n.parentElement
      if (skipped(el)) continue

      // aria-label · title 은 속성이라 텍스트 노드로 잡히지 않는다.
      // 스크린리더용 텍스트는 로케일 언어를 쓴다 (NFR-4.4 · 06 §2.4).

      const exemptId = exemptIdFor(el)
      if (exemptId !== null) {
        if (registered.has(exemptId)) {
          used.add(exemptId)
          continue
        }
        violations.push({
          screen: screen.id,
          rule: 'unregistered-exemption',
          path: pathOf(el),
          text: `data-wordless-exempt="${exemptId}"`,
        })
        continue
      }

      if (wordsOf(text).length > maxWords) {
        violations.push({
          screen: screen.id,
          rule: 'too-many-words',
          path: pathOf(el),
          text: text.trim(),
        })
        continue
      }
      if (SENTENCE_PUNCT.test(text.trim())) {
        violations.push({
          screen: screen.id,
          rule: 'sentence-punctuation',
          path: pathOf(el),
          text: text.trim(),
        })
        continue
      }
      if (functionWordCount(text) >= FUNCTION_WORD_LIMIT) {
        violations.push({
          screen: screen.id,
          rule: 'sentence-shape',
          path: pathOf(el),
          text: text.trim(),
        })
      }
    }
  }

  for (const e of exemptions) {
    if (!used.has(e.id)) {
      violations.push({
        screen: e.screen,
        rule: 'stale-exemption',
        path: e.id,
        text: e.reason,
      })
    }
  }

  return { violations, usedExemptions: [...used] }
}

export function formatViolations(violations: readonly WordlessViolation[]): string {
  return violations
    .map((v) => `  [${v.screen}] ${v.rule}\n    at ${v.path}\n    "${v.text}"`)
    .join('\n')
}
