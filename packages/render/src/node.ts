/**
 * 렌더 트리 규격.
 *
 * 07 합격 기준 5 의 절반이 여기서 결정된다.
 *
 * 무언어 원칙을 CI 테스트로만 지키면, 테스트는 위반을 발견할 뿐 방지하지 못한다.
 * 그래서 렌더 트리에 **자유 문자열을 그리는 노드 타입을 두지 않는다.**
 * 텍스트가 화면에 올라가는 경로는 두 개뿐이고 둘 다 제약이 걸려 있다.
 *
 *   label  — 로케일 번들에 등록되고 8개 언어 전부 3단어 이내임이 확인된 키만
 *   num    — 숫자 + 단위. 문장이 될 수 없다
 *
 * RenderNode 는 순수 데이터라 소비처가 셋인데 구현은 하나다.
 *   브라우저 toSvg()  ·  서버 toPng()  ·  테스트 트리 직접 순회
 */
import type { TokenRef } from '@preflight/tokens'
import type { IconKey } from './icons.ts'

/** 06 §2.2 — 허용되는 단위 */
export const UNITS = ['px', '%', '$', 'w', 'd', 's', 'K', 'pt', 'wpm', 'dB', ''] as const
export type Unit = (typeof UNITS)[number]

export type AssetRef = string & { readonly __asset?: never }

export interface Rect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export type RenderNode =
  | ({ readonly k: 'box'; readonly fill: TokenRef; readonly r?: number } & Rect)
  /** 판별 대상 외 정보. 본문은 회색 바로 지운다 (02 §4.1) */
  | ({ readonly k: 'bar'; readonly fill: TokenRef } & Rect)
  | {
      readonly k: 'swatch'
      readonly x: number
      readonly y: number
      readonly size: number
      readonly color: string
    }
  | ({ readonly k: 'img'; readonly src: AssetRef; readonly fit: 'cover' | 'contain' } & Rect)
  | {
      readonly k: 'glyph'
      readonly x: number
      readonly y: number
      readonly size: number
      readonly icon: IconKey
    }
  | {
      readonly k: 'num'
      readonly x: number
      readonly y: number
      readonly value: number
      readonly unit: Unit
      readonly digits?: number
    }
  /** "2 / 6" — 진행 표시. 문자열로 조립하지 않는다 */
  | { readonly k: 'ratio'; readonly x: number; readonly y: number; readonly num: number; readonly den: number }
  /** 06 §5.3 시그니처. 인장 대신 잠금 게이지 */
  | {
      readonly k: 'gauge'
      readonly x: number
      readonly y: number
      readonly w: number
      readonly filled: number
      readonly total: number
      readonly locked: boolean
    }
  /** 등록된 라벨 키만. 문자열 자체가 아니라 키다 */
  | { readonly k: 'label'; readonly x: number; readonly y: number; readonly key: string }
  | {
      readonly k: 'group'
      readonly x: number
      readonly y: number
      readonly children: readonly RenderNode[]
    }

export type RenderNodeKind = RenderNode['k']

export function walk(node: RenderNode, visit: (n: RenderNode) => void): void {
  visit(node)
  if (node.k === 'group') for (const child of node.children) walk(child, visit)
}

export function collect(node: RenderNode): RenderNode[] {
  const out: RenderNode[] = []
  walk(node, (n) => out.push(n))
  return out
}

/** 트리가 참조하는 라벨 키 전부. 프로파일 검증이 이걸 번들과 대조한다. */
export function labelKeysIn(node: RenderNode): string[] {
  const keys: string[] = []
  walk(node, (n) => {
    if (n.k === 'label') keys.push(n.key)
  })
  return keys
}
