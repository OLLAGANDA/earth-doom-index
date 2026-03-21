# Anonymous Doom Vote MVP Design

**Date:** 2026-03-21
**Status:** Approved
**Scope:** 익명 투표 — "내일 점수가 오를까요 / 내릴까요 / 그대로일까요?"

---

## 문제 / 목표

현재 사이트는 수동적 — 보기만 하고 끝. 방문자가 무언가 **행동**할 수 있는 가장 작은 단위의 인터랙션을 추가해 재방문 이유를 만든다. 로그인 없이 익명으로 동작하며, AI API 추가 호출 없음.

---

## 투표 시간 규칙

스케줄러는 매일 **UTC 00:01**에 doom 점수를 계산한다. 계산 완료까지 수 분이 소요될 수 있으므로 투표 오픈은 **UTC 00:05**로 설정해 5분 버퍼를 둔다.

| 구간 | 시간 (UTC) | 상태 |
|------|-----------|------|
| 투표 오픈 | 00:05 ~ 23:58 | 투표 가능 (재투표 포함) |
| 투표 마감 | 23:59 이후 ~ 다음날 00:05 | 투표 불가, 결과 대기 중 |
| 결과 오픈 | 다음날 00:05 이후 | 어제 예측 결과 표시 |

프론트엔드는 **서버 `target_date` 기준**으로 현재 UTC 시각을 비교해 상태를 결정한다.
(`new Date()` UTC 시각 사용은 허용. `target_date` 계산에만 서버 응답 기준을 사용한다.)

**방어 로직:** `today-doom` 응답의 `target_date`가 오늘 날짜(UTC 기준)가 아닌 경우(= 새 점수 미계산 상태), 투표 UI 전체를 숨긴다. 이 경우 `phase = 'pending'`으로 처리하며 "결과 집계 중" 메시지를 표시한다.

---

## 기능 흐름

1. 오늘 아직 투표하지 않은 경우 → **UP / FLAT / DOWN 버튼** 표시
2. 버튼 클릭 → 선택 버튼 강조 표시 → `POST /api/vote` 호출 → 로컬스토리지에 저장
3. 투표 후 → 집단 예측 결과 바 표시 + **재투표 버튼** 표시
4. 재투표 버튼 클릭 → 투표 화면으로 복귀, 이전 선택 버튼 강조 유지
5. UTC 23:59 이후 → 투표 마감 상태 (버튼 비활성, 재투표 불가)
6. 다음날 UTC 00:05 이후, `target_date`가 오늘인 경우 → 어제 예측 결과 표시
7. `target_date`가 어제인 경우 (계산 미완료) → 투표 UI 숨김, "집계 중" 표시

로컬스토리지 키: `edi-vote-YYYY-MM-DD` (값: `'up'|'flat'|'down'`)
재투표 시 로컬스토리지 값을 새 선택으로 덮어쓴다.

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

**`target_date` 명확화:** `target_date`는 항상 **예측 대상 날짜**, 즉 투표하는 날의 다음 날짜다. 예: 2026-03-21에 투표하면 `target_date = 2026-03-22`. 프론트엔드는 `data.target_date`(오늘 doom 기록 날짜)에 +1일한 값을 전송한다.

인덱스: `target_date` (집계 쿼리 빈번)

중복 방지 및 재투표는 **프론트엔드 로컬스토리지**에서 처리. 백엔드는 모든 투표를 단순 insert (재투표 시 새 row 추가). 집계는 COUNT로 계산하므로 재투표가 중복 집계되지 않도록 **프론트엔드가 재투표 시 이전 투표를 취소하는 DELETE를 선제 호출하지 않는다** — 대신 `POST /api/vote`는 upsert 방식이 아닌 insert이므로, 재투표 지원을 위해 **`DELETE /api/vote`** 엔드포인트를 추가해 이전 투표를 제거 후 새 insert한다.

> **재투표 시퀀스:** `DELETE /api/vote` (이전 투표 제거) → `POST /api/vote` (새 투표 insert)
> 단, 프론트엔드에서 로컬스토리지에 이전 투표 ID를 저장하지 않으므로, DELETE는 `target_date` 기준 해당 날짜 전체 집계에서 1표를 빼는 방식으로 처리한다: `DELETE FROM votes WHERE target_date = $1 AND direction = $2 LIMIT 1`

어뷰징 방어는 MVP 범위 외.

### 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| `POST /api/vote` | `{ direction, target_date }` | 투표 저장 |
| `DELETE /api/vote` | `{ direction, target_date }` | 재투표 시 이전 투표 1건 제거 |
| `GET /api/vote/today` | — | 오늘 집계 + 어제 예측 결과 반환 |

새 엔드포인트는 기존 `edi-backend/routes/doom.js`에 추가한다 (별도 파일 생성 없음).

#### `POST /api/vote` 요청/응답

- 요청: `{ direction: 'up' | 'flat' | 'down', target_date: 'YYYY-MM-DD' }`
- `direction` 이외 값이거나 `target_date` 형식 오류 → `400 { error: 'Invalid input' }`
- 성공 시 → `201 { up: N, flat: N, down: N }` (업데이트된 집계 반환)
- DB 오류 → `500 { error: 'Database error' }`

#### `DELETE /api/vote` 요청/응답

- 요청: `{ direction: 'up' | 'flat' | 'down', target_date: 'YYYY-MM-DD' }`
- 해당 조건의 row 1건 삭제. 없으면 무시 (204 반환)
- 성공 시 → `204 No Content`
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
- `yesterday.prediction`: 3택 중 최다 득표 방향. 동률 우선순위: `'up'` > `'flat'` > `'down'`
- `yesterday.actual`: doom_records에서 어제 vs 그저께 total_score 비교
  - 상승 → `'up'`, 동일 → `'flat'`, 하락 → `'down'`
  - 두 기록 중 하나라도 없으면 `null`
- `yesterday.correct`: `prediction === actual`. `actual`이 `null`이면 `null`
- `yesterday` 필드는 어제 votes 데이터가 없으면 `null`

### DB 함수 (`db/index.js` 추가)

```js
saveVote(targetDate, direction)                              // INSERT 1건
deleteVote(targetDate, direction)                            // DELETE 1건 (LIMIT 1)
getVotesToday(targetDate) → { up: N, flat: N, down: N }
getYesterdayVoteResult(yesterdayDate, dayBeforeDate)
  → { up, flat, down, prediction, actual, correct } | null
```

`initDB()`에 `votes` 테이블 생성 구문 추가.

### 파일 변경

| 파일 | 변경 |
|------|------|
| `edi-backend/db/index.js` | `votes` 테이블 init + 4개 DB 함수 추가 |
| `edi-backend/routes/doom.js` | `POST /api/vote`, `DELETE /api/vote`, `GET /api/vote/today` 추가 |

---

## 프론트엔드

### 위치

AI 코멘터리 섹션과 점수 카드 사이에 `<VoteSection>` 컴포넌트 삽입.

### 시간 상태 판별

```js
function getVotePhase(todayDoomDate) {
  // todayDoomDate: data.target_date (서버 기준)
  // 현재 UTC 날짜와 비교:
  //   target_date < today  → 'pending' (새 점수 미계산, 투표 UI 숨김)
  //   target_date == today, UTC 00:05 ~ 23:58 → 'open'
  //   target_date == today, UTC 23:59 이후    → 'closed'
  //   target_date > today  → 'result' (어제 예측 결과 표시)
}
```

### 상태 관리

```js
function useVote(todayDoomDate) {
  // todayDoomDate: useDoomData()의 data.target_date
  // 로컬스토리지 키: edi-vote-YYYY-MM-DD (예측 대상 날짜 = todayDoomDate + 1일)
  // 반환: { myVote, phase, showBallot, setShowBallot, castVote, voteData, loading }
}
```

- `myVote`: `'up'` | `'flat'` | `'down'` | `null`
- `phase`: `'open'` | `'closed'` | `'result'`
- `showBallot`: 투표 후 재투표 버튼 클릭 시 투표 화면을 다시 보여주는 토글
- `castVote(direction)`: 재투표 시 DELETE → POST 순서로 호출, 로컬스토리지 갱신

### UI 상태 (4가지)

**① 투표 전 (phase=open, myVote=null):**
```
┌──────────────────────────────────────┐
│ 🎰 TOMORROW'S PREDICTION             │
│  내일 멸망 지수?                      │
│  [ ▲ UP ]  [ — FLAT ]  [ ▽ DOWN ]   │
└──────────────────────────────────────┘
```

**② 투표 후 (phase=open, myVote 있음, showBallot=false):**
```
┌──────────────────────────────────────┐
│ 🎰 TOMORROW'S PREDICTION             │
│  ▲ UP   ████████░░  55% (78명)       │
│  — FLAT ████░░░░░░  25% (36명)  ◀내선택│
│  ▽ DOWN ███░░░░░░░  20% (28명)       │
│  총 142명 예측                        │
│  [ CHANGE VOTE ]                     │
└──────────────────────────────────────┘
```

내가 선택한 방향의 행에 강조 표시 (예: `◀` 또는 `is-primary` 색상).

**③ 재투표 화면 (phase=open, showBallot=true):**

투표 전 UI와 동일하나, 이전 선택 버튼이 `is-primary` 강조 상태로 표시됨.

**④ 투표 마감 (phase=closed):**
```
┌──────────────────────────────────────┐
│ 🎰 TOMORROW'S PREDICTION             │
│  ▲ UP   55% / — FLAT 25% / ▽ DOWN 20%│
│  VOTING CLOSED — RESULTS TOMORROW    │
└──────────────────────────────────────┘
```

**⑤ 결과 공개 (phase=result, yesterday 있음):**
```
┌──────────────────────────────────────┐
│ 📊 YESTERDAY'S RESULT                │
│  55%가 UP 예측 → 실제 —              │
│  ✗ WRONG (또는 ✓ CORRECT)            │
└──────────────────────────────────────┘
+ 아래 새 투표 UI (phase=open)
```

### i18n

투표 버튼 라벨은 **KO/EN 모두 영어로 고정** (픽셀 폰트 한글 미지원).
`i18n.js`에 `vote` 키 추가 — 버튼 라벨(`UP`, `FLAT`, `DOWN`)은 하드코딩, 안내 문구와 상태 메시지만 번역 제공.

```js
vote: {
  title: 'TOMORROW\'S PREDICTION',
  question: '내일 멸망 지수?',          // KO
  // question: 'Tomorrow\'s doom?',    // EN
  changeVote: 'CHANGE VOTE',
  closed: 'VOTING CLOSED — RESULTS TOMORROW',
  resultTitle: 'YESTERDAY\'S RESULT',
  correct: 'CORRECT',
  wrong: 'WRONG',
  totalVoters: (n) => `${n}명 예측`,    // KO
  // totalVoters: (n) => `${n} votes`, // EN
}
```

### 파일 변경

| 파일 | 변경 |
|------|------|
| `edi-frontend/src/App.jsx` | `useVote` hook + `VoteSection` 컴포넌트 + `getVotePhase` 함수 추가 |
| `edi-frontend/src/App.css` | VoteSection 스타일 추가 |
| `edi-frontend/src/i18n.js` | `vote` 번역 키 추가 |

---

## 범위 외 (이번 MVP 제외)

- 로그인 / 계정 시스템
- 포인트 / 리더보드
- 광고 연동
- IP 기반 중복 방지
