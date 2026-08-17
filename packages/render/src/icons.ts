/**
 * 아이콘 등록소 — 06 §5.4 · 02 §2 L-5.
 *
 * 열린 문자열이 아니라 유니온이다. 등록되지 않은 아이콘은 타입 에러이며,
 * 등록 시점에 금지 목록(손 제스처·동물·종교 상징·얼굴 표정)을 기계가 본다.
 * 문화권마다 의미가 달라지는 기호는 무언어 UI에서 오해의 주된 원인이다.
 */
export const ICONS = [
  // 상태
  'lock',
  'unlock',
  'check',
  'x',
  'pause',
  'clock',
  'shield',
  // 방향
  'arrow-right',
  'arrow-left',
  'arrow-up',
  'arrow-down',
  'arrow-back',
  'refresh',
  // 비교·계산
  'scale',
  'plus',
  'minus',
  'currency',
  // 사물
  'file',
  'picture',
  'download',
  'upload',
  'grid',
  // 기하
  'circle',
  'square',
  'triangle',
  'dot',
  'bar',
] as const

export type IconKey = (typeof ICONS)[number]

/**
 * 금지 어휘. 06 §5.4 표를 기계가 읽을 수 있는 형태로 옮긴 것이다.
 * 'cross' 가 금지인 이유: ✕ 를 뜻하려다 종교 상징으로 읽힌다. 'x' 를 쓴다.
 */
export const BANNED_ICON_TERMS = [
  // 손 제스처
  'hand',
  'thumb',
  'finger',
  'palm',
  'fist',
  'wave',
  'clap',
  'point',
  // 얼굴·표정
  'face',
  'smile',
  'frown',
  'emoji',
  'wink',
  'eye',
  // 동물
  'animal',
  'dog',
  'cat',
  'bird',
  'paw',
  'fish',
  // 종교
  'pray',
  'cross',
  'crescent',
  'star-of',
  'church',
  'temple',
  'halo',
  // 지역 편차가 큰 기호
  'stamp',
  'seal',
  'chop',
] as const

const ICON_SET: ReadonlySet<string> = new Set(ICONS)
export function isIconKey(x: string): x is IconKey {
  return ICON_SET.has(x)
}

export function bannedTermIn(name: string): string | null {
  const lower = name.toLowerCase()
  return BANNED_ICON_TERMS.find((term) => lower.includes(term)) ?? null
}
