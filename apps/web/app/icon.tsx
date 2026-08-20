/**
 * 파비콘 — 잠금 게이지.
 *
 * 이 제품의 시그니처는 인장이 아니라 **차오르는 게이지**다 (06 §5.3).
 * 문화 중립이고, 탭 목록에서 작게 떠도 무엇인지 읽힌다.
 */
import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          background: '#16181c',
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 16,
              borderRadius: 1,
              // 4칸 중 3칸이 차 있다. 진행 중인 합의가 이 제품의 상태다
              background: i < 3 ? '#5fa3c9' : '#3a4149',
            }}
          />
        ))}
      </div>
    ),
    size,
  )
}
