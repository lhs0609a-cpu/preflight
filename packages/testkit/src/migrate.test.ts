/**
 * 마이그레이션 — **이미 돌고 있는 DB 에 올렸을 때**를 본다.
 *
 * 새 DB 에서 통과하는 것은 아무것도 증명하지 않는다. 실제 사고는 반대편에서
 * 난다: `migrate()` 는 매번 모든 파일을 실행하는데 001 은
 * `CREATE TABLE IF NOT EXISTS` 라서 **테이블이 이미 있으면 통째로 no-op** 이다.
 * 거기에 컬럼을 끼워 넣으면 새 컬럼은 영원히 생기지 않고, 배포 직후 첫 INSERT
 * 에서 column ... does not exist 로 죽는다.
 *
 * 그래서 여기서는 001 만 적용된 DB 를 만들어 두고 그 위에 migrate() 를 돌린다.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'
import { MIGRATIONS_DIR, PgSessionStore, migrate } from '@preflight/db'
import { compileAllProfiles } from './profiles.ts'
import { pgliteSql } from './stores.ts'

/** 001 이 만드는 session 테이블에는 없던 것들 */
const ADDED = ['requests', 'review_gate', 'reviewed_at'] as const

const web = compileAllProfiles().find((p) => p.slug === 'web')!

async function columnsOf(db: PGlite): Promise<Set<string>> {
  const r = await db.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'session'`,
  )
  return new Set(r.rows.map((x) => x.column_name))
}

describe('마이그레이션', () => {
  it('001 만 적용된 DB 에 migrate() 를 돌리면 새 컬럼이 생긴다', async () => {
    const db = new PGlite()
    const sql = pgliteSql(db)

    // 배포 전 운영 DB 를 재현한다 — 001 만 실행된 상태
    await db.exec(readFileSync(path.join(MIGRATIONS_DIR, '001_init.sql'), 'utf8'))
    const before = await columnsOf(db)
    for (const c of ADDED) expect(before.has(c)).toBe(false)

    await migrate(sql)

    const after = await columnsOf(db)
    for (const c of ADDED) expect(after.has(c)).toBe(true)
    await db.close()
  })

  it('두 번 돌려도 안전하다 — 첫 요청마다 자동 적용되므로 반복 실행된다', async () => {
    const db = new PGlite()
    const sql = pgliteSql(db)
    await migrate(sql)
    await expect(migrate(sql)).resolves.toBeDefined()
    await db.close()
  })

  it('올린 뒤 세션이 새 필드까지 그대로 왕복한다', async () => {
    const db = new PGlite()
    const sql = pgliteSql(db)
    await db.exec(readFileSync(path.join(MIGRATIONS_DIR, '001_init.sql'), 'utf8'))
    await migrate(sql)

    await db.query(`INSERT INTO pro (id, email, display_name) VALUES ('p1', 'a@b.co', 'A')`)
    const store = new PgSessionStore(sql)
    const now = new Date().toISOString()

    await store.put({
      id: 'sess1',
      no: 'PF-2608-0001',
      token: 'tok1',
      proId: 'p1',
      profile: web,
      state: 'ISSUED',
      choices: {},
      picks: {},
      scope: {},
      assets: {},
      settled: [],
      submitted: [],
      negotiations: [],
      axisOverrides: {},
      revisionsUsed: 0,
      requests: [],
      pnrPassedAt: null,
      reviewGate: true,
      reviewedAt: null,
      createdAt: now,
      openedAt: null,
      settledAt: null,
      clientLabel: null,
      marketplace: null,
    })

    const back = await store.byToken('tok1')
    expect(back?.reviewGate).toBe(true)
    expect(back?.reviewedAt).toBeNull()
    expect(back?.requests).toEqual([])
    await db.close()
  })
})
