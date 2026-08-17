/**
 * 디자인 토큰 — 06 §5.
 *
 * 색은 의미만 갖는다. 06 §5.2 · NFR-1.3 — 색만으로 구분하지 않으므로
 * 모든 상태 표현은 색 + 모양 + 위치 세 가지를 함께 쓴다 (L-4).
 */
export const COLOR = {
  lock: '#2C5F7C', // 확정·잠금
  agree: '#17694F', // 무상·합의
  cost: '#8A6410', // 비용 발생
  stop: '#9B3B2E', // 되돌림 불가
  ink: '#16181C', // 본문
  paper: '#FFFFFF',
  mute: '#D9DDE1', // 판별 대상 외 정보 (회색 바)
} as const

export type TokenRef = keyof typeof COLOR

export const MOTION = {
  /** 06 §5.5 */
  duration: 140,
  easing: 'cubic-bezier(.2,0,0,1)',
} as const

/** 06 §5.6 — 신흥국 네트워크 기준 상한 */
export const BUDGET = {
  initialLoadMs: 3000,
  cardResponseMs: 100,
  imagesPerLinkBytes: 1_500_000,
} as const

export function cssVariables(): string {
  const lines = Object.entries(COLOR).map(([k, v]) => `  --${k}: ${v};`)
  lines.push(`  --motion-duration: ${MOTION.duration}ms;`)
  lines.push(`  --motion-easing: ${MOTION.easing};`)
  return `:root {\n${lines.join('\n')}\n}\n`
}
