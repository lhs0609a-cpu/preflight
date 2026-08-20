/**
 * 웹폰트 로딩 — 06 §5.1.
 *
 * 그전까지 globals.css 는 'Pretendard Variable' 과 'IBM Plex Mono' 를 **이름으로만**
 * 지정하고 실제 파일을 받아오지 않았다. 개발자 기기에는 대개 깔려 있어 눈으로는
 * 잡히지 않지만, 인도·베트남·필리핀 사용자에게는 전부 시스템 폴백으로 떨어진다.
 * "수치가 이 제품의 주어"인데 그 수치의 폰트가 뜨지 않는 상태였다.
 *
 * next/font 는 빌드 시점에 파일을 받아 **자체 호스팅**한다. 런타임에 구글로
 * 나가는 요청이 없고, 폴백 메트릭을 자동으로 맞춰 CLS 가 생기지 않는다.
 *
 * ── 라우트별로 쪼개려다 되돌린 기록 ──────────────────────────────────
 * 한글과 본문 폰트를 모듈·스코프로 나눠 클라이언트 화면(무언어 · 신흥국 4G ·
 * 3초 예산)에서 빼려 했으나, Turbopack 이 CSS 를 라우트별로 분리하지 않아
 * 세 라우트의 실측치가 완전히 같았다. 이득 0 에 스코프를 빠뜨릴 위험만 남아
 * 단순한 쪽으로 되돌렸다. 실제로 효과가 있는 레버는 preload 하나뿐이다.
 */
import { IBM_Plex_Mono, Inter, Noto_Sans_KR } from 'next/font/google'

/**
 * 본문.
 *
 * 06 §5.1 이 550·650 같은 중간 굵기를 쓰므로 가변 폰트여야 한다 — 고정 굵기
 * 폰트면 그 값들이 조용히 600 으로 스냅된다.
 *
 * 서브셋을 로케일 8종에서 역산해 cyrillic·vietnamese 까지 넣었다가 뺐다.
 * 지금 그 언어로 렌더되는 글자가 한 자도 없기 때문이다 — 콘솔은 아직 한국어
 * 하드코딩이고 클라이언트 화면은 무언어다. 넣어두니 키릴 서브셋 85KB 를
 * 아무 이유 없이 받았다(실측). 콘솔 i18n 이 붙을 때 되살린다.
 */
export const sans = Inter({
  variable: '--f-sans',
  subsets: ['latin'],
  display: 'swap',
})

/**
 * 수치 전용. 이 제품에서 가장 중요한 폰트다 — 클라이언트 화면에 뜨는 것이
 * 사실상 이것뿐이다.
 *
 * 가변이 아니므로 실제로 쓰는 굵기만 명시한다:
 * 400(기본) · 600(.pf-num · .pro-no) · 700(.lp-zero).
 */
export const mono = IBM_Plex_Mono({
  variable: '--f-mono',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
})

/**
 * 한글 — 콘솔 텍스트용.
 *
 * subsets 에 'korean' 을 쓸 수 없다. 구글 폰트 메타데이터에 그런 이름의
 * 서브셋이 없고 타입이 'cyrillic' | 'latin' | 'latin-ext' | 'vietnamese' 만
 * 받는다. 한글 글리프는 이름 붙은 서브셋이 아니라 unicode-range 청크로 딸려
 * 오므로 'latin' 만 적어도 받아진다 (@font-face 127개가 생기는 것으로 확인).
 *
 * preload 를 끄는 것이 이 파일에서 유일하게 실측으로 효과가 확인된 조치다.
 * 켜면 그 127개가 전부 첫 화면에 딸려 오고, 끄면 한글이 실제로 그려질 때만
 * 받는다 — 무언어인 클라이언트 화면에서는 **한 바이트도** 받지 않는다.
 */
export const kr = Noto_Sans_KR({
  variable: '--f-kr',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
})
