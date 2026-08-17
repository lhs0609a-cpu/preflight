/**
 * `image` 렌더러 — 02 §4.1.
 *
 * **확장성의 열쇠다.** 프리랜서가 포트폴리오 2장 + 축 이름 + 두 라벨 +
 * measure 2개만 적으면 축이 완성된다. 렌더 함수가 필요 없으므로
 * 모든 카테고리가 코드 변경 0으로 열린다 (07 합격 기준 2).
 *
 * 유일하게 이미지를 쓰는 렌더러이므로 용량 상한(NFR-2.4 · 링크당 1.5MB)은
 * 업로드 단계에서 압축·WebP 변환으로 지킨다.
 */
import type { CardValues } from '@preflight/core'
import type { RenderNode } from '../node.ts'
import type { Renderer, RenderOpts } from '../renderer.ts'

export const imageRenderer: Renderer = {
  id: 'image',
  fields: {
    src: { kind: 'asset' },
  },

  render(values: CardValues, { w, h }: RenderOpts): RenderNode {
    const src = values['src']
    if (typeof src !== 'string' || src.length === 0) {
      // 업로드 전 자리. 문장이 아니라 회색 면으로 비운다.
      return { k: 'box', x: 0, y: 0, w, h, fill: 'mute' }
    }
    return { k: 'img', x: 0, y: 0, w, h, src, fit: 'cover' }
  },
}
