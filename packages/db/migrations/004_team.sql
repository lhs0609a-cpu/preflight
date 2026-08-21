-- C-09 팀 대조 — FR-7 · 03 §2.6.
--
-- 결정권자가 여럿인 계약에서 누가 어디서 갈리는지를 보여주려면, 팀원 각자의
-- 선택을 따로 들고 있어야 한다. 주 클라이언트의 choices 옆에 얹을 수는 없다.
--
-- **최종 사양은 주 클라이언트의 선택으로 간다.** 대조는 정보 제공이다 —
-- 시스템은 어느 쪽도 막지 않고 누가 정했는지만 기록한다(04 §5.3). 다수결이나
-- 합의 강제를 넣으면 이 제품이 지켜온 그 원칙이 깨진다.
--
-- 토큰에 UNIQUE 를 건다. 조회가 한 곳으로 모여야 "이 토큰이 누구인가" 가
-- 한 번의 질의로 끝난다 (NFR-5.1 — 토큰만으로 접근하므로).
CREATE TABLE IF NOT EXISTS session_member (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  -- 화면의 A · B · C. 이름을 받지 않는다 — 이름을 넣는 순간 로케일이 필요해지고
  -- "누가 틀렸나" 를 가리키는 화면이 된다 (06 §C-09).
  seq        INT  NOT NULL,
  -- blockId → side 배열. 주 클라이언트의 session_block.answers 와 같은 모양
  choices    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, seq)
);
CREATE INDEX IF NOT EXISTS session_member_session ON session_member (session_id);
