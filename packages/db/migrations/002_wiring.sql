-- M1 잔여 배선 — C-04 역제안 관문 · C-11 수정 요청.
--
-- 001 을 고치지 않고 새 파일로 나눈 이유가 전부다. migrate() 는 매번 모든
-- 파일을 순서대로 실행하는데, 001 은 CREATE TABLE IF NOT EXISTS 이므로
-- **이미 테이블이 있는 운영 DB 에서는 통째로 no-op** 이다. 거기에 컬럼을
-- 끼워 넣어봐야 새 컬럼은 영원히 생기지 않고, 첫 INSERT 에서
-- column "requests" does not exist 로 죽는다.
--
-- ADD COLUMN IF NOT EXISTS 라 신규 DB(001 이 만들어 둔 뒤)와 기존 DB 양쪽에서
-- 안전하게 반복 실행된다.

-- FR-9 · 03 §2.11 — 제출된 수정 요청과 그 판정.
-- note 는 제품 전체에서 유일한 자유 텍스트이며 프리랜서 화면에서만 보인다.
ALTER TABLE session ADD COLUMN IF NOT EXISTS requests JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 04 §5.2 — 확정 전 프리랜서 검토를 거칠지. 발급 시 결정되고 이후 불변.
-- 기본 꺼짐: 켜면 클라이언트가 다시 와야 하는데 알림 채널이 아직 없다(13 §6).
ALTER TABLE session ADD COLUMN IF NOT EXISTS review_gate BOOLEAN NOT NULL DEFAULT false;

-- 검토가 끝난 시각. 관문은 "켜짐" 이 아니라 "아직 검토 전" 일 때 막는 것이다 —
-- 켜짐으로 판단하면 클라이언트가 역제안에 전부 응답한 뒤에도 확정이 영영 막힌다.
ALTER TABLE session ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
