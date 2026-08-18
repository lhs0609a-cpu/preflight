/**
 * SQL 실행기 인터페이스.
 *
 * pg 든 PGlite 든 여기에 맞추면 된다. 저장소가 특정 드라이버를 알면
 * 테스트를 임베디드 Postgres 로 돌릴 수 없고, 돌릴 수 없으면 검증되지 않은
 * DB 계층을 쓰게 된다.
 */
export interface QueryResult<T> {
  readonly rows: T[]
}

export interface Sql {
  query<T = Record<string, unknown>>(text: string, params?: readonly unknown[]): Promise<QueryResult<T>>
  /** 여러 문장을 한 번에 실행한다. 마이그레이션 파일용. */
  exec?(text: string): Promise<void>
}

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const MIGRATIONS_DIR = path.resolve(HERE, '../migrations')

/** 마이그레이션을 순서대로 적용한다. 전부 IF NOT EXISTS 라 반복 실행이 안전하다. */
export async function migrate(sql: Sql): Promise<string[]> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  for (const file of files) {
    const text = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    if (sql.exec) await sql.exec(text)
    else await sql.query(text)
  }
  return files
}
