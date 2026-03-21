# Vote Countdown Timer — Design Spec

**Date:** 2026-03-21
**Status:** Approved

---

## Overview

투표 섹션에 남은 투표 시간을 사용자가 직관적으로 인지할 수 있도록 타임 칩(corner time chip)을 추가한다.

---

## Voting Time Window

투표 시스템의 phase는 UTC 기준으로 정의된다.

| Phase | UTC 시간대 | 의미 |
|-------|-----------|------|
| `pending` | 00:00 ~ 00:04 | 점수 계산 중, 투표 미오픈 |
| `open` | 00:05 ~ 23:58 | 투표 진행 중 |
| `closed` | 23:59 이후 | 투표 마감 |

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
| `pending` | `OPENS IN` | 초록(`#92cc41`) | 00:05 UTC까지 카운트다운 |
| `open` (>= 1시간 남음) | `VOTE CLOSES IN` | 초록(`#92cc41`) | — |
| `open` (< 1시간 남음) | `VOTE CLOSES IN` | 노랑(`#f7d51d`) | 임박 경고 |
| `closed` | — | — | 칩 미표시, 기존 "VOTING CLOSED" 유지 |

- 카운트다운은 `HH:MM:SS` 포맷으로 매초 갱신
- 칩은 투표 완료 후 결과 뷰(myVote 있음)에서도 동일하게 표시

---

## Architecture

### `useVoteCountdown()` 훅

`App.jsx`에 추가. 매초 `setInterval`로 갱신.

**반환값:**
```js
{
  label: 'VOTE CLOSES IN' | 'OPENS IN' | null,
  time: 'HH:MM:SS' | null,   // null이면 closed
  urgent: boolean             // true면 노랑색 (< 1시간)
}
```

**계산 로직:**
- `pending`: 다음 00:05 UTC까지 남은 초 계산
- `open`: 당일 23:59 UTC까지 남은 초 계산
- `closed`: `null` 반환

컴포넌트 언마운트 시 `clearInterval`로 정리.

### `VoteTimerChip` 컴포넌트

```jsx
function VoteTimerChip({ label, time, urgent }) {
  // label, time이 null이면 null 반환
  // urgent=true면 warn 클래스 적용
}
```

### VoteSection 변경

- `useVoteCountdown(todayDoomDate)` 호출
- `phase === 'pending'`일 때 기존 `return null` 대신 칩만 표시하는 최소 UI 렌더링
- `open` / `closed` 상태의 기존 레이아웃에 칩 삽입

---

## File Changes

| 파일 | 변경 내용 |
|------|----------|
| `edi-frontend/src/App.jsx` | `useVoteCountdown` 훅 추가, `VoteTimerChip` 컴포넌트 추가, `VoteSection` 수정 |
| `edi-frontend/src/App.css` | `.vote-timer-chip`, `.vote-timer-chip.warn` 스타일 추가 |
| `edi-frontend/src/i18n.js` | `voteClosesIn`, `opensIn` 레이블 문구 추가 |

새 파일 없음.

---

## Out of Scope

- 서버 사이드 변경 없음
- 투표 마감(`closed`) 상태에서의 카운트다운 (다음 날 오픈까지) — 추후 고려
- 모바일 전용 레이아웃 변경 없음 (칩은 기존 flex 레이아웃에 자연스럽게 편입)
