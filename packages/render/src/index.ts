export * from './icons.ts'
export * from './node.ts'
export * from './renderer.ts'
export * from './to-svg.ts'
export * from './compose.ts'
export * from './renderers/index.ts'

/**
 * M0 렌더러를 이 모듈 인스턴스에 등록한다 (부수효과).
 *
 * 등록을 호출자에게 맡기면 번들 경계마다 빠뜨린다. Next 는 서버 컴포넌트와
 * 클라이언트 컴포넌트에 **서로 다른 모듈 그래프**를 준다 — 한쪽에서 등록해도
 * 다른 쪽 레지스트리는 비어 있고, 화면이 RENDERER_NOT_FOUND 로 죽는다.
 * 레지스트리를 가진 모듈이 스스로 채우면 그 실수를 할 수 없다.
 */
import { registerM0Renderers } from './renderers/index.ts'
registerM0Renderers()
