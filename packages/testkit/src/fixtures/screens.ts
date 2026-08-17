/**
 * 클라이언트 화면 픽스처 (M0 골격).
 *
 * M1 에서 실제 화면 컴포넌트로 교체된다. 지금은 무언어 검사기가 무엇을
 * 통과시키고 무엇을 막는지 고정하는 것이 목적이다.
 *
 * aria-label 에 일부러 완전한 문장을 넣어 두었다 — 스크린리더용 텍스트는
 * 로케일 언어를 쓰며(NFR-4.4) 검사에서 제외됨을 증명한다.
 */
import { toSvg, type RenderNode } from '@preflight/render'
import type { Screen } from '../wordless.ts'

/** en 번들의 일부. 전체 번들 검증은 tools/ci/check-labels.ts 가 파일에서 읽어 한다. */
const dict: Record<string, string> = {
  spacing: 'Spacing',
  saturation: 'Saturation',
  density: 'Density',
  focus: 'Focus',
  image: 'Image',
  text: 'Text',
}

const svg = (node: RenderNode, w: number, h: number): string => toSvg(node, { w, h, dict })

const group = (children: RenderNode[]): RenderNode => ({ k: 'group', x: 0, y: 0, children })

// C-01 링크 진입 — 아바타 + 소요 시간 + 단계 수 + 시작 버튼
const c01 = `
<section data-screen="C-01">
  <img src="/avatar.webp" alt="Freelancer profile photo" width="64" height="64">
  ${svg(
    group([
      { k: 'glyph', x: 0, y: 0, size: 16, icon: 'clock' },
      { k: 'num', x: 24, y: 13, value: 5, unit: '' },
      { k: 'glyph', x: 0, y: 30, size: 8, icon: 'dot' },
      { k: 'glyph', x: 16, y: 30, size: 8, icon: 'circle' },
      { k: 'glyph', x: 32, y: 30, size: 8, icon: 'circle' },
      { k: 'glyph', x: 48, y: 30, size: 8, icon: 'circle' },
      { k: 'glyph', x: 64, y: 30, size: 8, icon: 'circle' },
    ]),
    120,
    48,
  )}
  <button type="button" aria-label="Start the specification session, it takes about five minutes">
    ${svg({ k: 'glyph', x: 0, y: 0, size: 20, icon: 'arrow-right' }, 20, 20)}
  </button>
</section>`

// C-02 취향 카드 — 진행 바 + 카드 2장 + 뒤로
const c02 = `
<section data-screen="C-02">
  ${svg(
    group([
      { k: 'gauge', x: 0, y: 0, w: 120, filled: 2, total: 6, locked: false },
      { k: 'ratio', x: 200, y: 6, num: 2, den: 6 },
    ]),
    260,
    16,
  )}
  <div role="group">
    <button type="button" aria-label="Choose the option on the left">
      ${svg(
        group([
          { k: 'box', x: 0, y: 0, w: 120, h: 80, fill: 'paper', r: 0 },
          { k: 'bar', x: 12, y: 16, w: 96, h: 8, fill: 'mute' },
          { k: 'bar', x: 12, y: 32, w: 72, h: 8, fill: 'mute' },
        ]),
        120,
        80,
      )}
    </button>
    <button type="button" aria-label="Choose the option on the right">
      ${svg(
        group([
          { k: 'box', x: 0, y: 0, w: 120, h: 80, fill: 'paper', r: 12 },
          { k: 'bar', x: 12, y: 16, w: 96, h: 8, fill: 'mute' },
          { k: 'bar', x: 12, y: 32, w: 72, h: 8, fill: 'mute' },
        ]),
        120,
        80,
      )}
    </button>
  </div>
  <button type="button" aria-label="Go back to the previous pair">
    ${svg({ k: 'glyph', x: 0, y: 0, size: 16, icon: 'arrow-left' }, 16, 16)}
  </button>
</section>`

// C-03 사양 확인 — 라벨 + 수치 + 자물쇠
const specRow = (key: string, value: number, unit: 'px' | '%' | '', y: number): RenderNode =>
  group([
    { k: 'label', x: 0, y, key },
    { k: 'num', x: 120, y, value, unit },
    { k: 'glyph', x: 190, y: y - 11, size: 14, icon: 'lock' },
  ])

const c03 = `
<section data-screen="C-03">
  ${svg(
    group([
      specRow('spacing', 32, 'px', 14),
      specRow('saturation', 11, '%', 34),
      specRow('density', 2, '', 54),
      { k: 'glyph', x: 0, y: 66, size: 14, icon: 'lock' },
      { k: 'glyph', x: 20, y: 66, size: 14, icon: 'arrow-right' },
      { k: 'glyph', x: 40, y: 66, size: 14, icon: 'currency' },
      { k: 'glyph', x: 60, y: 66, size: 14, icon: 'clock' },
    ]),
    220,
    90,
  )}
  <button type="button" aria-label="Confirm these values and lock them">
    ${svg({ k: 'glyph', x: 0, y: 0, size: 18, icon: 'check' }, 18, 18)}
  </button>
  <button type="button" aria-label="Redo the selection">
    ${svg({ k: 'glyph', x: 0, y: 0, size: 18, icon: 'refresh' }, 18, 18)}
  </button>
</section>`

// C-06 톤 선택 — 유일하게 영문 문장이 노출되는 화면 (06 §C-06)
const c06 = `
<section data-screen="C-06">
  <ol data-wordless-exempt="c06-tone-samples">
    <li>${svg({ k: 'glyph', x: 0, y: 0, size: 14, icon: 'shield' }, 14, 14)} 20 years of practice</li>
    <li>${svg({ k: 'glyph', x: 0, y: 0, size: 14, icon: 'clock' }, 14, 14)} Sick today? Seen today.</li>
    <li>${svg({ k: 'glyph', x: 0, y: 0, size: 14, icon: 'circle' }, 14, 14)} Care before you need it.</li>
  </ol>
</section>`

// C-07 범위 조립 — 아이콘 + 최소 단어 + 숫자, 하단 합계
const scopeRow = (icon: 'grid' | 'picture' | 'file', key: string, usd: number, y: number): RenderNode =>
  group([
    { k: 'glyph', x: 0, y: y - 11, size: 14, icon },
    { k: 'label', x: 24, y, key },
    { k: 'num', x: 140, y, value: usd, unit: '$' },
  ])

const c07 = `
<section data-screen="C-07">
  ${svg(
    group([
      scopeRow('grid', 'image', 180, 14),
      scopeRow('picture', 'text', 80, 34),
      scopeRow('file', 'focus', 120, 54),
      { k: 'num', x: 0, y: 80, value: 380, unit: '$' },
      { k: 'glyph', x: 90, y: 69, size: 14, icon: 'clock' },
      { k: 'num', x: 112, y: 80, value: 6, unit: 'w' },
    ]),
    200,
    96,
  )}
</section>`

// C-10 완료 — 체크 + 세션 번호 + 사양 + 합계 + PDF
const c10 = `
<section data-screen="C-10">
  ${svg(
    group([
      { k: 'glyph', x: 0, y: 0, size: 24, icon: 'check' },
      { k: 'gauge', x: 0, y: 34, w: 120, filled: 11, total: 11, locked: true },
      specRow('spacing', 32, 'px', 70),
      specRow('saturation', 11, '%', 90),
      { k: 'num', x: 0, y: 116, value: 480, unit: '$' },
      { k: 'num', x: 70, y: 116, value: 2, unit: 'w' },
      { k: 'glyph', x: 120, y: 105, size: 14, icon: 'refresh' },
      { k: 'num', x: 142, y: 116, value: 3, unit: '' },
    ]),
    240,
    130,
  )}
  <p class="pf-no">PF-2609-0142</p>
  <button type="button" aria-label="Download the specification as a PDF file">
    ${svg({ k: 'glyph', x: 0, y: 0, size: 18, icon: 'download' }, 18, 18)}
  </button>
</section>`

export const CLIENT_SCREENS: readonly Screen[] = [
  { id: 'C-01', html: c01 },
  { id: 'C-02', html: c02 },
  { id: 'C-03', html: c03 },
  { id: 'C-06', html: c06 },
  { id: 'C-07', html: c07 },
  { id: 'C-10', html: c10 },
]
