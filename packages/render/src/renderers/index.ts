/**
 * M0 구현 렌더러 3종 — 07 §2 "렌더러 인터페이스 + 3종 구현: web · image + 1종".
 *
 * 나머지 9종은 M4 까지 image 렌더러로 커버 가능하며, 그것이 합격 기준 2가
 * 성립하는 이유다.
 */
import { hasRenderer, registerRenderer, type Renderer } from '../renderer.ts'
import { webRenderer } from './web.ts'
import { photoRenderer } from './photo.ts'
import { imageRenderer } from './image.ts'

export { webRenderer, photoRenderer, imageRenderer }

export const M0_RENDERERS: readonly Renderer[] = [webRenderer, photoRenderer, imageRenderer]

/** 여러 번 불러도 안전하다. */
export function registerM0Renderers(): void {
  for (const r of M0_RENDERERS) if (!hasRenderer(r.id)) registerRenderer(r)
}
