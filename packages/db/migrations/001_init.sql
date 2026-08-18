-- 03 문서 스키마 — M1 에 필요한 부분.
--
-- 마켓플레이스 연동(marketplace_link)·과금(invoice)·계약 매칭(contract_match)은
-- M2/M3 에서 붙인다. 지금 만들면 쓰이지 않는 채로 굳는다.
--
-- 03 문서와의 차이 두 가지 (문서에 반영 필요):
--   1. session_block.answers — PAIRWISE 의 **진행 중** 선택(side 배열).
--      03 은 cursor 만 갖고 있는데, 커서만으로는 새로고침 후 복원이 안 된다.
--   2. session.scope / session.assets — 확정 전 체크 상태.
--      block_output 은 확정된 결과만 담으므로 중간 상태가 갈 곳이 없다.

CREATE TABLE IF NOT EXISTS pro (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  locale        TEXT NOT NULL DEFAULT 'en',
  country       TEXT,
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  state         TEXT NOT NULL DEFAULT 'ACTIVE'
                CHECK (state IN ('ACTIVE','BILLING_HOLD','SUSPENDED')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 03 §2.2 — 카드 원번호는 저장하지 않는다. PG 빌링키만 보관한다 (NFR-5.4).
CREATE TABLE IF NOT EXISTS billing_method (
  id            TEXT PRIMARY KEY,
  pro_id        TEXT NOT NULL REFERENCES pro(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,
  billing_key   TEXT NOT NULL,
  brand         TEXT,
  last4         TEXT,
  is_default    BOOLEAN NOT NULL DEFAULT true,
  verified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS billing_method_pro ON billing_method (pro_id) WHERE verified_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS session (
  id               TEXT PRIMARY KEY,
  no               TEXT UNIQUE NOT NULL,
  pro_id           TEXT NOT NULL REFERENCES pro(id) ON DELETE CASCADE,
  profile_slug     TEXT NOT NULL,
  -- 12 §4.4 — 발급 시점의 컴파일된 프로파일. 개정돼도 진행 중 세션은 안 흔들린다
  profile_snapshot JSONB NOT NULL,

  client_label     TEXT,
  client_locale    TEXT,
  marketplace      TEXT,

  state            TEXT NOT NULL DEFAULT 'ISSUED',
  ball             TEXT NOT NULL DEFAULT 'CLIENT' CHECK (ball IN ('CLIENT','PRO')),

  -- 확정 전 중간 상태 (03 문서 확장)
  scope            JSONB NOT NULL DEFAULT '{}'::jsonb,
  assets           JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- 04 §5 — 근거(reason)는 여기 남고 클라이언트에게는 절대 내려가지 않는다
  negotiations     JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- 04 §5.3 — 조율로 확정된 축. owner 가 책임 귀속 기록이다
  axis_overrides   JSONB NOT NULL DEFAULT '{}'::jsonb,
  revisions_used   INT NOT NULL DEFAULT 0,
  pnr_passed_at    TIMESTAMPTZ,

  opened_at        TIMESTAMPTZ,
  settled_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS session_pro_state ON session (pro_id, state);

-- 03 §2.6 — NFR-5.1 128bit 이상. 토큰만으로 접근하므로 유일 인덱스가 필수다.
CREATE TABLE IF NOT EXISTS access_token (
  id           TEXT PRIMARY KEY,
  session_id   TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  token        TEXT UNIQUE NOT NULL,
  actor        TEXT NOT NULL CHECK (actor IN ('CLIENT','TEAMMATE')),
  expires_at   TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  use_count    INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS access_token_live ON access_token (token) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS session_block (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  block_id    TEXT NOT NULL,
  block_type  TEXT NOT NULL,
  seq         INT NOT NULL,
  state       TEXT NOT NULL DEFAULT 'LOCKED_OUT'
              CHECK (state IN ('LOCKED_OUT','OPEN','SUBMITTED','SETTLED')),
  -- PAIRWISE 진행 중 선택. 커서만으로는 새로고침 후 복원이 안 된다
  answers     JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- PICK_N 선택 인덱스
  pick        INT,
  UNIQUE (session_id, block_id)
);

CREATE TABLE IF NOT EXISTS block_output (
  id               TEXT PRIMARY KEY,
  session_block_id TEXT NOT NULL REFERENCES session_block(id) ON DELETE CASCADE,
  lines            JSONB NOT NULL,
  amount_delta_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  days_delta       INT NOT NULL DEFAULT 0,
  locked_at        TIMESTAMPTZ,
  locked_by        TEXT CHECK (locked_by IN ('CLIENT','TEAMMATE','PRO')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 03 §2.8 — content_hash 가 분쟁 시 확정 시점 사양을 증명한다
CREATE TABLE IF NOT EXISTS spec (
  id           TEXT PRIMARY KEY,
  session_id   TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  version      INT NOT NULL DEFAULT 1,
  lines        JSONB NOT NULL,
  amount_usd   NUMERIC(10,2) NOT NULL,
  weeks        INT NOT NULL,
  offer_text   TEXT,
  content_hash TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, version)
);

-- 03 §2.15 — 불변. v2 사전 부검의 학습 데이터가 된다
CREATE TABLE IF NOT EXISTS event_log (
  id          BIGSERIAL PRIMARY KEY,
  session_id  TEXT REFERENCES session(id) ON DELETE CASCADE,
  pro_id      TEXT REFERENCES pro(id),
  at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor       TEXT NOT NULL,
  kind        TEXT NOT NULL,
  summary_key TEXT NOT NULL,
  detail      JSONB
);
CREATE INDEX IF NOT EXISTS event_log_session ON event_log (session_id, at DESC);
