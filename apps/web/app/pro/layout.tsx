/**
 * 프리랜서 화면 레이아웃.
 *
 * **lang·dir 을 여기서 걸지 않는다.** Next 레이아웃은 searchParams 를 받지
 * 못해서 `?lang=ar` 을 볼 수가 없다. 여기서 계정 로케일로 걸었더니 내용은
 * 아랍어인데 dir 은 ltr 인 화면이 나왔다 — 로케일을 아는 쪽이 걸어야 한다.
 *
 * 그래서 이 레이아웃은 자리만 잡는다. 실제 lang·dir 은 ProConsole ·
 * SessionDetail · SignupForm 이 자기 루트에 건다.
 */
import type { ReactNode } from 'react'

export default function ProLayout({ children }: { children: ReactNode }) {
  return children
}
