/**
 * 저장소 어댑터 — 계약 테스트가 두 구현을 같은 방식으로 세운다.
 *
 * Postgres 쪽은 PGlite(임베디드 Postgres)로 돈다. 실제 서버를 띄우지 않고도
 * 03 문서의 진짜 스키마가 실행되므로, 검증되지 않은 DB 계층을 쓸 일이 없다.
 * 같은 SQL 이 운영 Postgres 에서도 돈다.
 */
import { PGlite } from '@electric-sql/pglite'
import { InMemoryProStore, InMemorySessionStore, type ProStore, type SessionStore } from '@preflight/session'
import { PgProStore, PgSessionStore, migrate, type Sql } from '@preflight/db'

export interface StoreBundle {
  readonly name: string
  readonly sessions: SessionStore
  readonly pros: ProStore
  close(): Promise<void>
}

export function pgliteSql(db: PGlite): Sql {
  return {
    async query(text, params) {
      const r = await db.query(text, params === undefined ? undefined : [...params])
      return { rows: r.rows as never[] }
    },
    async exec(text) {
      await db.exec(text)
    },
  }
}

export async function memoryStores(): Promise<StoreBundle> {
  return {
    name: 'in-memory',
    sessions: new InMemorySessionStore(),
    pros: new InMemoryProStore(),
    close: async () => {},
  }
}

export async function postgresStores(): Promise<StoreBundle> {
  const db = new PGlite()
  const sql = pgliteSql(db)
  await migrate(sql)
  return {
    name: 'postgres',
    sessions: new PgSessionStore(sql),
    pros: new PgProStore(sql),
    close: async () => {
      await db.close()
    },
  }
}

/** 계약 테스트가 도는 대상. 새 저장소를 추가하면 여기에만 넣으면 된다. */
export const STORE_ADAPTERS: readonly { name: string; make: () => Promise<StoreBundle> }[] = [
  { name: 'in-memory', make: memoryStores },
  { name: 'postgres', make: postgresStores },
]
