/**
 * 불변식 위반은 예외가 아니라 버그다.
 * code 는 05 §1 의 에러 코드와 별개인 내부 코드이며 절대 사용자에게 노출하지 않는다.
 */
export class InvariantError extends Error {
  constructor(
    readonly code: string,
    detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code)
    this.name = 'InvariantError'
  }
}

export function invariant(cond: unknown, code: string, detail?: string): asserts cond {
  if (!cond) throw new InvariantError(code, detail)
}

export function wordCount(s: string): number {
  return s.trim().length === 0 ? 0 : s.trim().split(/\s+/u).length
}
