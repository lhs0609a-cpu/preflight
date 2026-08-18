/**
 * 실제 Postgres 어댑터 — `pg` 드라이버를 Sql 인터페이스에 맞춘다.
 *
 * 저장소 자체는 PGlite 로 이미 계약 테스트를 통과했다. 여기서 하는 일은
 * 드라이버 모양을 맞추는 것뿐이며, 그래서 이 파일이 짧다. 그것이 Sql 인터페이스를
 * 둔 이유다 — 드라이버가 저장소 안으로 들어오면 테스트가 불가능해진다.
 *
 * pg 를 의존성으로 넣지 않는다. 운영 배포에서만 필요하고, 개발·테스트에서는
 * 네이티브 바이너리를 끌고 올 이유가 없다. 호출자가 풀을 만들어 넘긴다.
 */
import type { Sql } from './sql.ts'

/** `pg` 의 Pool 이 만족하는 최소 형태. pg 타입을 import 하지 않기 위한 구조적 타입. */
export interface PgPoolLike {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>
}

export function pgSql(pool: PgPoolLike): Sql {
  return {
    async query(text, params) {
      const r = await pool.query(text, params === undefined ? undefined : [...params])
      return { rows: r.rows as never[] }
    },
    async exec(text) {
      // pg 는 simple query 프로토콜에서 다중 문장을 허용한다 (params 가 없을 때만).
      await pool.query(text)
    },
  }
}

/**
 * 운영 연결 예시.
 *
 *   import { Pool } from 'pg'
 *   const sql = pgSql(new Pool({ connectionString: process.env.DATABASE_URL }))
 *   await migrate(sql)
 *   const store = new PgSessionStore(sql)
 */
export const DATABASE_URL_ENV = 'DATABASE_URL'
