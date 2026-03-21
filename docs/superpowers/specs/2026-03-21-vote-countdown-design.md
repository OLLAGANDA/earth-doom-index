# Vote Countdown Timer — Design Spec

**Date:** 2026-03-21
**Status:** Approved

---

## Overview

투표 섹션에 남은 투표 시간을 사용자가 직관적으로 인지할 수 있도록 타임 칩(corner time chip)을 추가한다.

---

## Voting Time Window

투표 시스템의 phase는 UTC 기준으로 정의된다.

| Phase | UTC 범위 | 의미 |
|-------|---------|------|
| `pending` | 00:00:00 ~ 00:04:59 | 점수 계산 중, 투표 미오픈 |
| `open` | 00:05:00 ~ 23:58:59 | 투표 진행 중 |
| `closed` | 23:59:00 ~ 23:59:59 | 투표 마감 |

`getVotePhase(todayDoomDate)`: `todayDoomDate`가 오늘 UTC 날짜보다 이전이면 서버 데이터 갱신 전으로 보고 `'pending'`을 반환한다(날짜 지연 케이스).

---

## UI Design

### VoteTimerChip

투표 질문 텍스트 우측에 배치되는 작은 칩 컴포넌트.

```
┌─────────────────────────────────┐
│ TOMORROW'S DOOM?   ┌──────────┐ │
│                    │VOTE      │ │
│                    │CLOSES IN │ │
│                    │04:23:17  │ │
│                    └──────────┘ │
│  [ ▲ UP ] [ — FLAT ] [ ▽ DOWN ] │
└─────────────────────────────────┘
```

### 상태별 동작

| Phase | 칩 레이블 | 색상 | 비고 |
|-------|----------|------|------|
| `pending` (오늘 00:00~00:04) | `OPENS IN` | 초록(`#92cc41`) | 00:05:00 UTC까지 카운트다운. 투표 버튼 미표시 |
| `pending` (날짜 지연) | — | — | 칩 미표시. 기존처럼 `null` 렌더링 |
| `open` (남은 시간 >= 3600초) | `VOTE CLOSES IN` | 초록(`#92cc41`) | — |
| `open` (남은 시간 < 3600초) | `VOTE CLOSES IN` | 노랑(`#f7d51d`) | 레이블 동일, 색상만 변경 |
| `closed` | — | — | 칩 미표시, 기존 "VOTING CLOSED" 유지 |

- 카운트다운은 `HH:MM:SS` 포맷으로 매초 갱신
- 칩은 투표 완료 후 결과 뷰(myVote 있음)에서도 동일하게 표시

---

## Architecture

### `useVoteCountdown(todayDoomDate)` 훅

`App.jsx`에 추가. `todayDoomDate`('YYYY-MM-DD', 서버 기준 오늘 날짜)를 받는다. `data.target_date`에 시간 컴포넌트가 포함될 수 있으므로 훅 내부에서 `.slice(0, 10)`으로 날짜 부분만 사용.

**반환값:**
```js
{ label: 'VOTE CLOSES IN' | 'OPENS IN' | null, time: 'HH:MM:SS' | null, urgent: boolean }
```

불변 조건: `label`과 `time`은 항상 함께 null이거나 함께 non-null. `urgent`는 `open`에서 남은 초 < 3600일 때만 `true`.

**계산 로직:**

마운트 시 즉시 1회 계산 후, 이후 매초 `setInterval`로 반복. 각 틱에서 `const now = new Date()`로 UTC 스냅샷을 한 번 생성하고, 이 값을 stale 체크와 `getVotePhase` 호출에 모두 사용해 두 비교가 동일한 시각을 기준으로 하도록 보장한다.

`getVotePhase`는 날짜 지연과 오늘 00:00~00:04 모두 `'pending'`을 반환하므로, `dateStr`와 `todayUTC`를 직접 비교해 두 케이스를 구분한다. `todayUTC`는 `now.toISOString().slice(0, 10)` 형식의 `'YYYY-MM-DD'` 문자열. `dateStr`도 동일 형식이므로 string 비교로 날짜 대소를 판단한다.

1. `todayDoomDate` null/undefined → `{ label: null, time: null, urgent: false }`, 인터벌 미시작
2. `dateStr < todayUTC` (날짜 지연) → `{ label: null, time: null, urgent: false }` (칩 미표시)
3. `dateStr === todayUTC` + UTC 00:00~00:04 (오늘 pending): 당일 `00:05:00 UTC`까지 남은 초 계산. 남은 초 ≤ 0이면 phase 전환된 것으로 보고 `{ label: null, time: null, urgent: false }` 반환. 양수이면 → `label: 'OPENS IN'`, `urgent: false`
4. `getVotePhase` = `'open'`: 당일 `23:59:00 UTC`까지 남은 초 → `label: 'VOTE CLOSES IN'`, `urgent: 남은초 < 3600`
5. `getVotePhase` = `'closed'` (23:59:00~23:59:59): `{ label: null, time: null, urgent: false }`. 카운트 0 후 다음 틱에 전환. `00:00:00` 미표시. 23:59:59 이후(자정)의 동작은 Out of Scope — 미드나이트 리셋 로직 불필요.

**인터벌 정리:** 언마운트 시 `clearInterval`. phase 무관하게 인터벌 유지(경계 감지용).

### `VoteTimerChip` 컴포넌트

```jsx
function VoteTimerChip({ label, time, urgent }) {
  // label이 null이면 null 반환
  // urgent=true면 .vote-timer-chip.warn 클래스 적용 (노랑색 #f7d51d)
  // 기본 색상: 초록 #92cc41 (.vote-timer-chip 기본 스타일)
}
```

레이블은 locale 무관 영문 고정 (픽셀 폰트 Press Start 2P 한글 미지원). i18n.js 변경 불필요.

### VoteSection 변경

`VoteSection`의 props 인터페이스(`todayDoomDate`, `lang`)는 변경 없음. 내부에서 `useVoteCountdown(todayDoomDate)`를 추가 호출.

**기존 가드 조건 변경:**

`useVoteCountdown`은 훅이므로 조기 반환 이전에 무조건적으로 호출해야 한다 (Rules of Hooks). `VoteSection` 함수 상단에서 먼저 호출한다:

```js
function VoteSection({ todayDoomDate, lang }) {
  const t = translations[lang].vote
  const { myVote, phase, showBallot, setShowBallot, castVote, voteData, loading } = useVote(todayDoomDate)
  const countdown = useVoteCountdown(todayDoomDate)  // 가드 이전에 호출

  // countdown.label !== null이면 오늘 pending → 칩 표시를 위해 fall through
  if (!phase || (phase === 'pending' && countdown.label === null) || loading) return null
  ...
}
```

`countdown.label !== null`인 경우(오늘 00:00~00:04)는 가드를 통과해 아래 pending 브랜치를 렌더링한다.

**각 렌더 브랜치별 칩 위치:**

| 브랜치 | 변경 내용 |
|-------|---------|
| `pending` (날짜 지연, `countdown.label === null`) | 가드에서 `null` 반환 — 기존과 동일 |
| `pending` (오늘 00:00~00:04, `countdown.label !== null`) | 섹션 컨테이너 + 질문 텍스트(`TOMORROW'S DOOM?`) + `VoteTimerChip`. 투표 버튼 미표시. |
| `open` (투표 전 / 재투표) | 질문 텍스트 `<p>` 우측에 `VoteTimerChip` 병치 (flex row) |
| `open` (투표 후 결과 뷰) | `vote-result-body` 상단에 `VoteTimerChip` 추가 |
| `closed` | 칩 미표시. 기존 "VOTING CLOSED" 레이아웃 유지 |

---

## File Changes

| 파일 | 변경 내용 |
|------|----------|
| `edi-frontend/src/App.jsx` | `useVoteCountdown` 훅, `VoteTimerChip` 컴포넌트 추가, `VoteSection` 수정 |
| `edi-frontend/src/App.css` | `.vote-timer-chip`, `.vote-timer-chip.warn` 스타일 추가 |
| `edi-frontend/src/i18n.js` | 변경 없음 |

새 파일 없음.

---

## Out of Scope

- 서버 사이드 변경 없음
- `closed` 상태에서의 카운트다운 (다음 날 오픈까지) — 추후 고려
- 모바일 전용 레이아웃 변경 없음
- 자정 UTC 경계에서의 `todayDoomDate` 자동 갱신 — 추후 고려
