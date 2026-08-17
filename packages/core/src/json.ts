import { z } from 'zod'

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
  ]),
)

/**
 * 결정적 직렬화. 03 §2.8 content_hash 의 근거.
 * 키를 사전순으로 정렬하고 공백을 제거한다. Map 순회 순서에 의존하면
 * 같은 선택이 다른 해시를 낳고 분쟁 증거로서의 자격을 잃는다.
 */
export function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const keys = Object.keys(value).sort()
  const body = keys
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k] as JsonValue)}`)
    .join(',')
  return `{${body}}`
}

export function deepEqual(a: JsonValue, b: JsonValue): boolean {
  return canonicalJson(a) === canonicalJson(b)
}
