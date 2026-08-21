-- 세션 번호 시퀀스 — 03 §2.5.
--
-- 그전까지 번호는 **인스턴스 메모리 카운터**에서 나왔다. 서버리스는 요청마다
-- 다른 인스턴스가 뜰 수 있어서 두 인스턴스가 같은 번호를 발급하고, session.no
-- 의 UNIQUE 제약이 그 순간 터진다. 링크 발급이 실패하는 형태로 나타나므로
-- 사용자에게 그대로 보인다.
--
-- 번호는 PF-YYMM-NNNN 이라 **달마다 다시 1부터** 시작한다. 그래서 전역
-- SEQUENCE 가 아니라 기간별 행이다.
CREATE TABLE IF NOT EXISTS session_counter (
  period TEXT PRIMARY KEY,          -- 'YYYYMM'
  n      INT  NOT NULL DEFAULT 0
);
