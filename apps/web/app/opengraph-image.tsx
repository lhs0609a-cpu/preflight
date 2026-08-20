/**
 * 링크 미리보기 — 09 §2.1.
 *
 * 이 제품은 **링크를 채팅에 붙여넣는 것이 전부**다. 그런데 썸네일이 없으면
 * 클라이언트가 보는 것은 정체불명의 URL 한 줄이고, 낯선 사람이 보낸 링크는
 * 열리지 않는다. 미리보기는 장식이 아니라 전환율이다.
 *
 * 카드 두 장과 게이지를 그린다 — 화면을 열기 전에 무엇을 하게 될지 보인다.
 */
import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Preflight — agree before you start, in any language'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: '#2c5f7c',
            }}
          >
            Preflight
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 68,
              fontWeight: 700,
              letterSpacing: -2,
              color: '#16181c',
              lineHeight: 1.1,
            }}
          >
            <span>Agree before you start.</span>
            <span>In any language.</span>
          </div>
          <div style={{ display: 'flex', fontSize: 28, color: '#5b636d' }}>
            Your client picks. You get numbers.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {/* 카드 두 장 — 딱 한 축만 다르다 */}
          <div style={{ display: 'flex', gap: 24 }}>
            {[24, 56].map((pad) => (
              <div
                key={pad}
                style={{
                  width: 190,
                  height: 150,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: pad / 2,
                  border: '1px solid #e8ebee',
                  borderRadius: 14,
                  background: '#fbfbfc',
                }}
              >
                <div style={{ display: 'flex', height: 10, borderRadius: 3, background: '#d9dde1' }} />
                <div style={{ display: 'flex', height: 10, width: '70%', borderRadius: 3, background: '#d9dde1' }} />
                <div style={{ display: 'flex', height: 10, width: '45%', borderRadius: 3, background: '#d9dde1' }} />
              </div>
            ))}
          </div>

          {/* 잠금 게이지 — 06 §5.3 의 시그니처 */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                style={{
                  width: 16,
                  height: 26,
                  borderRadius: 3,
                  background: i < 7 ? '#2c5f7c' : '#d9dde1',
                }}
              />
            ))}
            <div style={{ display: 'flex', marginLeft: 18, fontSize: 30, color: '#16181c' }}>7 / 10</div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
