/**
 * 프리랜서 화면 레이아웃.
 *
 * 하는 일은 lang 을 프리랜서 로케일로 맞추는 것 하나다. 루트가 lang="en" 인데
 * 이 화면의 텍스트는 그 사람의 언어라서, 그대로 두면 브라우저가 줄바꿈·폰트
 * 선택을 영어 규칙으로 한다. 클라이언트 화면은 무언어라 루트의 en 이 맞다.
 */
import type { ReactNode } from 'react'
import { proLocale } from '../_lib/actions.ts'

export default async function ProLayout({ children }: { children: ReactNode }) {
  return <div lang={await proLocale()}>{children}</div>
}
