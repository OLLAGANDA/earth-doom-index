# Anonymous Doom Vote MVP Design

**Date:** 2026-03-21
**Status:** Approved
**Scope:** 익명 투표 — "내일 점수가 오를까요 / 내릴까요 / 그대로일까요?"

---

## 문제 / 목표

현재 사이트는 수동적 — 보기만 하고 끝. 방문자가 무언가 **행동**할 수 있는 가장 작은 단위의 인터랙션을 추가해 재방문 이유를 만든다. 로그인 없이 익명으로 동작하며, AI API 추가 호출 없음.

---

## 기능 흐름

1. 오늘 아직 투표하지 않은 경우 → **UP / FLAT / DOWN 버튼** 표시
2. 버튼 클릭 → `POST /api/vote` 호출 → 로컬스토리지에 `edi-vote-YYYY-MM-DD: 'up'|'flat'|'down'` 저장
3. 투표 후 → **집단 예측 결과** 표시 (예: "55% UP ▲ / 25% FLAT — / 20% DOWN ▽, 총 142명")
4. 다음날 재방문 시 → 어제 예측 결과 표시 (예: "어제 55%가 UP 예측 → 실제 ▲ 정답!")

---

## 백엔드

### DB — `votes` 테이블

```sql
CREATE TABLE IF NOT EXISTS votes (
  id          SERIAL PRIMARY KEY,
  target_date DATE NOT NULL,        -- 예측 대상 날짜 = 투표일 기준 내일 (tomorrow)
  direction   VARCHAR(4) NOT NULL,  -- 'up' | 'flat' | 'down'
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**`target_date` 명확화:** `target_date`는 항상 **예측 대상 날짜**, 즉 투표하는 날의 다음 날짜다. 예: 2026-03-21에 투표하면 `target_date = 2026-03-22`. 프론트엔드는 `data.target_date`(오늘 doom 기록 날짜)에 +1일한 값을 전송한다. 클라이언트 `new Date()` 사용 시 타임존 불일치 위험이 있으므로, 반드시 `today-doom` API 응답의 `target_date`를 기준으로 계산한다.

인덱스: `target_date` (집계 쿼리 빈번)

중복 방지는 **프론트엔드 로컬스토리지**에서 처리. 백엔드는 모든 투표를 단순 insert. 어뷰징 방어는 MVP 범위 외.

### 새 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| `POST /api/vote` | `{ direction: 'up'\|'flat'\|'down', target_date: 'YYYY-MM-DD' }` | 투표 저장 |
| `GET /api/vote/today` | — | 오늘 집계 + 어제 예측 결과 반환 |

새 엔드포인트는 기존 `edi-backend/routes/doom.js`에 추가한다 (별도 파일 생성 없음). 파일이 커지면 향후 분리 가능하나 MVP 범위에서는 단일 라우터 파일 유지.

#### `POST /api/vote` 요청/응답

- 요청: `{ direction: 'up' | 'flat' | 'down', target_date: 'YYYY-MM-DD' }`
- `direction`이 `'up'`/`'flat'`/`'down'` 이외의 값이거나 `target_date`가 유효하지 않은 날짜 형식이면 → `400 { error: 'Invalid input' }`
- 성공 시 → `201 { up: N, flat: N, down: N }` (업데이트된 집계 반환, 프론트엔드 별도 GET 불필요)
- DB 오류 → `500 { error: 'Database error' }`

#### `GET /api/vote/today` 응답 형식

```json
{
  "target_date": "2026-03-22",
  "up": 78,
  "flat": 36,
  "down": 28,
  "yesterday": {
    "target_date": "2026-03-21",
    "up": 80,
    "flat": 20,
    "down": 30,
    "prediction": "up",
    "actual": "flat",
    "correct": false
  }
}
```

- `target_date`: 현재 투표 대상 날짜 (오늘 doom 날짜 + 1일)
- `yesterday.prediction`: 3택 중 최다 득표 방향. 동률인 경우 우선순위: `'up'` > `'flat'` > `'down'`
- `yesterday.actual`: doom_records에서 어제(target_date - 1) vs 그저께(target_date - 2) total_score 비교
  - 점수 상승 → `'up'`, 동일 → `'flat'`, 하락 → `'down'`
  - 두 기록 중 하나라도 없으면 `null`
- `yesterday.correct`: `prediction === actual`. `actual`이 `null`이면 `null`
- `yesterday` 필드는 어제 votes 데이터가 없으면 `null`

### DB 함수 (`db/index.js` 추가)

```js
// 투표 저장
saveVote(targetDate, direction)

// 오늘 집계
getVotesToday(targetDate) → { up: N, flat: N, down: N }

// 어제 집계 + 실제 결과
getYesterdayVoteResult(yesterdayDate, dayBeforeDate) → { up, flat, down, prediction, actual, correct } | null
```

`initDB()`에 `votes` 테이블 생성 구문 추가.

### 파일 변경

| 파일 | 변경 |
|------|------|
| `edi-backend/db/index.js` | `votes` 테이블 init + 3개 DB 함수 추가 |
| `edi-backend/routes/doom.js` | `POST /api/vote`, `GET /api/vote/today` 추가 |

---

## 프론트엔드

### 위치

AI 코멘터리 섹션과 점수 카드 사이에 `<VoteSection>` 컴포넌트 삽입.

### 상태 관리

```js
function useVote(todayDoomDate) {
  // todayDoomDate: useDoomData()의 data.target_date (서버 기준 날짜, new Date() 사용 금지)
  // 로컬스토리지 키: edi-vote-YYYY-MM-DD  (예측 대상 날짜 = todayDoomDate + 1일)
  // 반환: { myVote, castVote, voteData, loading }
}
```

- `myVote`: `'up'` | `'flat'` | `'down'` | `null` (오늘 투표 여부)
- `voteData`: `GET /api/vote/today` 응답
- `castVote(direction)`: POST 성공 시 응답의 집계로 voteData 갱신 (별도 GET 없음)

### UI 상태

**투표 전:**
```
┌──────────────────────────────────────┐
│ 🎰 TOMORROW'S PREDICTION             │
│  내일 멸망 지수가 어떻게 될까요?       │
│  [ ▲ UP ]  [ — FLAT ]  [ ▽ DOWN ]   │
└──────────────────────────────────────┘
```

**투표 후:**
```
┌──────────────────────────────────────┐
│ 🎰 TOMORROW'S PREDICTION             │
│  ▲ UP   ████████░░  55% (78명)       │
│  — FLAT ████░░░░░░  25% (36명)       │
│  ▽ DOWN ███░░░░░░░  20% (28명)       │
│  총 142명 예측                        │
└──────────────────────────────────────┘
```

**다음날 결과 (어제 예측이 있을 경우):**
```
┌──────────────────────────────────────┐
│ 📊 YESTERDAY'S RESULT                │
│  55%가 UP 예측 → 실제 —              │
│  ✗ 오답 (또는 ✓ 정답!)               │
└──────────────────────────────────────┘
```

### i18n

`i18n.js`에 `vote` 키 추가 (KO/EN). `flat` 방향의 번역 포함 (KO: `— 그대로`, EN: `— FLAT`).

### 파일 변경

| 파일 | 변경 |
|------|------|
| `edi-frontend/src/App.jsx` | `useVote` hook + `VoteSection` 컴포넌트 추가, 레이아웃 삽입 |
| `edi-frontend/src/App.css` | VoteSection 스타일 추가 |
| `edi-frontend/src/i18n.js` | `vote` 번역 키 추가 |

---

## 범위 외 (이번 MVP 제외)

- 로그인 / 계정 시스템
- 포인트 / 리더보드
- 광고 연동
- IP 기반 중복 방지
- 투표 기간 제한 (오늘 자정 마감 등)
