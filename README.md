# Preflight

**Agree before you start. In any language.**

프리랜스 마켓플레이스에서 언어 없이 사양을 확정하는 레이어.

기획·설계 문서는 상위 폴더(`../`)의 `00`~`12` 를 본다. 이 저장소는 그 구현이다.

---

## 현재 상태

**M0 — 블록 추상화 + 무언어 렌더** 진행 중.

M1 착수 가부는 사람 판단이 아니라 아래 5개 게이트로 결정한다 (`../12_m0_design.md` §12).

| # | 합격 기준 | 게이트 |
|---|---|---|
| 1 | 프로파일이 JSON으로만 표현 | `pnpm schema:check` |
| 2 | 새 유형 추가 시 코드 0줄 | `pnpm check:data-only` + eslint 로컬 룰 2종 |
| 3 | 두 축 동시 차이 불가능 | `pnpm test` (프로퍼티 기반) |
| 4 | reversibility만으로 정책 변경 | `pnpm test` |
| 5 | 클라이언트 문장 노드 0개 | `pnpm check:wordless` |

---

## 명령

```bash
pnpm install
pnpm gate              # 전체 게이트 (ci 는 pnpm 예약어라 gate 를 쓴다)
pnpm test              # 단위 + 프로퍼티
pnpm check:wordless    # G-5
pnpm schema:generate   # Zod → profile.schema.json 재생성
pnpm labels:check      # 8 로케일 × 3단어 이내
pnpm profiles:check    # 전 프로파일 컴파일 (라벨·렌더러 필드·아이콘 주입)
```

`profile:` 로 시작하는 커밋은 데이터만 담아야 한다.

```bash
git commit -m "profile: add print"
node tools/ci/check-data-only.mjs      # .ts 가 섞이면 실패
```

---

## 구조

```
packages/
  core/       블록 엔진. 순수 TS — DOM·DB·HTTP 의존 0
  render/     RenderNode 규격 + 렌더러
  tokens/     디자인 토큰 (06 §5)
  testkit/    무언어 검사기 · 픽스처
  profiles/   거래 유형. 데이터만
tools/ci/     게이트 스크립트
```

의존 방향은 한 방향뿐이다. `core` 는 아무것도 import 하지 않는다.

---

## 설계상 되돌리면 안 되는 것

| | 왜 |
|---|---|
| `Pair` 에 카드를 두 장 담지 않는다 | 두 축이 다른 쌍을 표현 불가능하게 만드는 유일한 방법 |
| `RenderNode` 에 자유 텍스트 노드를 추가하지 않는다 | 무언어 원칙을 테스트가 아니라 타입이 지킨다 |
| 리허설·PNR 을 프로파일 JSON 에 직접 쓰지 않는다 | 쓰는 순간 `reversibility` 가 아무 일도 하지 않게 된다 |
| `measure` 를 `t()` 에 넘길 수 있게 만들지 않는다 | 양측이 같은 것을 보는 유일한 근거 |
| 무언어 예외를 baseline 없이 허용하지 않는다 | 예외가 가장 쉬운 해결책이 되면 검사가 무력화된다 |

---

## 배포

```
GitHub  ──push──▶  Vercel (자동 빌드)
                     └─ DATABASE_URL ─▶ Postgres
```

### 환경 변수

| 이름 | 필수 | 설명 |
|---|---|---|
| `DATABASE_URL` | 배포에 필수 | 없으면 인메모리로 뜬다. 서버리스는 요청마다 인스턴스가 달라 세션이 사라진다 |
| `PF_BASE_URL` | 선택 | 링크 절대 주소. 비우면 Vercel 배포 도메인을 쓴다 |
| `PF_ALLOW_DEMO` | 선택 | `1` 이면 `/api/demo` 를 운영에서도 연다. 인증 없이 세션을 만드는 경로라 기본은 닫힘 |

마이그레이션은 첫 요청 때 자동 적용된다 (`IF NOT EXISTS` 라 반복 안전).

### 로컬에서 Postgres 로 돌리기

```bash
DATABASE_URL=postgres://... pnpm dev
```

설정하지 않으면 인메모리로 뜬다. 테스트는 항상 PGlite(임베디드 Postgres)로 진짜 스키마를 돌린다.
