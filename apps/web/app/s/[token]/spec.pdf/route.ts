/**
 * FR-8.3 — 사양서 PDF 내려받기.
 *
 * **언어 중립본만** 낸다. 양측이 같은 문서를 보는 것이 FR-8.2 이고,
 * 로케일 병기본은 프리랜서 화면에서만 쓴다.
 */
import { renderSheet, textToPdf } from '@preflight/core'
import { runtime } from '../../../_lib/runtime.ts'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await ctx.params
  const built = await (await runtime()).service.specOf(token)
  if (built === null) return new Response('not settled', { status: 404 })

  const pdf = textToPdf(renderSheet(built.spec), { title: built.spec.no })
  return new Response(pdf as BodyInit, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${built.spec.no}.pdf"`,
      'cache-control': 'no-store',
    },
  })
}
