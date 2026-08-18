/**
 * 사양서 PDF — FR-8.3.
 *
 * 라이브러리를 쓰지 않는다. 사양서는 고정폭 텍스트 한 장이고, 그것을 위해
 * 폰트 임베딩·레이아웃 엔진을 들이면 링크당 1.5MB 예산(NFR-2.4)과
 * 신흥국 네트워크 조건에 불리하다. PDF 기본 14종 폰트(Courier)를 쓰면
 * 파일이 2KB 안쪽이고 어디서나 열린다.
 *
 * **언어 중립 사양서만 PDF 로 낸다.** Courier 는 한글·데바나가리를 그리지
 * 못하고, 애초에 양측이 같은 문서를 보는 것이 FR-8.2 다. 로케일 병기본은
 * 프리랜서 화면에서만 쓴다.
 */
import { invariant } from '../invariant.ts'

const A4 = { w: 595.28, h: 841.89 }
const MARGIN = 56
const FONT_SIZE = 10
const LEADING = 13.5

/** Courier 는 WinAnsi 밖 문자를 그리지 못한다. 사양서에 쓰이는 기호만 옮긴다. */
const ASCII_MAP: Readonly<Record<string, string>> = {
  '─': '-',
  '·': '-',
  '×': 'x',
  '→': '->',
  '↺': 'o',
  '’': "'",
  '“': '"',
  '”': '"',
  '—': '-',
}

export function toAscii(text: string): string {
  let out = ''
  for (const ch of text) {
    const mapped = ASCII_MAP[ch]
    if (mapped !== undefined) out += mapped
    else if (ch.codePointAt(0)! < 128) out += ch
    else out += '?'
  }
  return out
}

const escapePdf = (s: string): string => s.replace(/([\\()])/gu, '\\$1')

export interface PdfOptions {
  /** 문서 제목 (메타데이터). ASCII 로 변환된다 */
  readonly title?: string
}

/**
 * 고정폭 텍스트 한 장을 PDF 바이트로.
 * 같은 입력이면 같은 바이트가 나온다 — 사양서 해시와 같은 이유로 결정적이어야 한다.
 */
export function textToPdf(text: string, opts: PdfOptions = {}): Uint8Array {
  const lines = toAscii(text).split('\n')
  const maxLines = Math.floor((A4.h - MARGIN * 2) / LEADING)
  invariant(lines.length <= maxLines, 'PDF_TOO_MANY_LINES', `${lines.length}/${maxLines}`)

  const body = lines.map((l) => `(${escapePdf(l)}) Tj T*`).join('\n')
  const content =
    `BT\n/F1 ${FONT_SIZE} Tf\n${LEADING} TL\n` +
    `${MARGIN} ${(A4.h - MARGIN).toFixed(2)} Td\n${body}\nET\n`

  const title = escapePdf(toAscii(opts.title ?? 'Preflight Spec'))

  const objects: string[] = [
    `<</Type/Catalog/Pages 2 0 R>>`,
    `<</Type/Pages/Kids[3 0 R]/Count 1>>`,
    `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${A4.w} ${A4.h}]` +
      `/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>`,
    `<</Length ${content.length}>>\nstream\n${content}endstream`,
    `<</Type/Font/Subtype/Type1/BaseFont/Courier/Encoding/WinAnsiEncoding>>`,
    `<</Title(${title})/Producer(Preflight)>>`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((obj, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })

  const xrefAt = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`
  pdf +=
    `trailer\n<</Size ${objects.length + 1}/Root 1 0 R/Info 6 0 R>>\n` +
    `startxref\n${xrefAt}\n%%EOF\n`

  return new TextEncoder().encode(pdf)
}
