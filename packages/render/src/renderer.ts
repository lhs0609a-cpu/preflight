/**
 * 렌더러 인터페이스 — 02 §4.1 · 12 §6.2.
 *
 * fields 를 선언하게 하는 이유: 프로파일 축의 field 가 렌더러가 해석하지 못하는
 * 이름이면 **로딩이 실패해야 한다.** photo 프로파일이 web 전용 필드를 쓰는 것을
 * 런타임에 발견하면 이미 늦다.
 */
import type { CardValues, RendererId } from '@preflight/core'
import type { RenderNode } from './node.ts'
import { invariant } from '@preflight/core'

export type FieldSpec =
  | { readonly kind: 'number'; readonly min?: number; readonly max?: number }
  | { readonly kind: 'boolean' }
  | { readonly kind: 'color' }
  | { readonly kind: 'enum'; readonly values: readonly string[] }
  | { readonly kind: 'asset' }

export interface RenderOpts {
  readonly w: number
  readonly h: number
}

export interface Renderer {
  readonly id: RendererId
  readonly fields: Readonly<Record<string, FieldSpec>>
  /** 순수 함수. 같은 입력이면 같은 트리 */
  render(values: CardValues, opts: RenderOpts): RenderNode
}

const REGISTRY = new Map<RendererId, Renderer>()

export function registerRenderer(r: Renderer): void {
  invariant(!REGISTRY.has(r.id), 'RENDERER_DUPLICATE', r.id)
  REGISTRY.set(r.id, r)
}

export function getRenderer(id: RendererId): Renderer {
  const r = REGISTRY.get(id)
  invariant(r !== undefined, 'RENDERER_NOT_FOUND', id)
  return r
}

export function hasRenderer(id: RendererId): boolean {
  return REGISTRY.has(id)
}

export function registeredRenderers(): RendererId[] {
  return [...REGISTRY.keys()]
}
