# Vote Countdown Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 투표 섹션에 남은 투표 시간을 실시간으로 표시하는 타임 칩(VoteTimerChip)을 추가한다.

**Architecture:** `useVoteCountdown` 훅이 매초 UTC 시간을 계산해 label/time/urgent를 반환. `VoteTimerChip` 컴포넌트가 칩 UI를 렌더링. `VoteSection`의 가드 조건 변경 후 각 브랜치에 칩을 삽입.

**Tech Stack:** React (hooks, useState, useEffect), nes.css (pixel-art CSS), 단일 파일 App.jsx

---

## File Map

| 파일 | 변경 내용 |
|------|----------|
| `edi-frontend/src/App.jsx` | `useVoteCountdown` 훅 추가 (~line 161), `VoteTimerChip` 컴포넌트 추가 (~line 189), `VoteSection` 수정 (lines 211–284) |
| `edi-frontend/src/App.css` | `.vote-timer-chip`, `.vote-timer-chip.warn`, `.vote-question-row` 스타일 추가 (line 298 이후) |

새 파일 없음.

---

### Task 1: `useVoteCountdown` 훅 추가

**Files:**
- Modify: `edi-frontend/src/App.jsx` — `useVote` 훅(line 160) 바로 뒤에 삽입

- [ ] **Step 1: 훅 코드 삽입**

`edi-frontend/src/App.jsx`의 line 160 (`return { myVote, phase, ...}`) 바로 다음 줄(빈 줄 뒤)에 아래 함수를 삽입한다.

```jsx
function useVoteCountdown(todayDoomDate) {
  function compute() {
    if (!todayDoomDate) return { label: null, time: null, urgent: false }
    const now = new Date()
    const todayUTC = now.toISOString().slice(0, 10)
    const dateStr = todayDoomDate.slice(0, 10)

    if (dateStr < todayUTC) return { label: null, time: null, urgent: false }

    const phase = getVotePhase(dateStr)
    if (phase === 'closed') return { label: null, time: null, urgent: false }

    const target = phase === 'pending'
      ? new Date(`${dateStr}T00:05:00Z`)
      : new Date(`${dateStr}T23:59:00Z`)
    const label = phase === 'pending' ? 'OPENS IN' : 'VOTE CLOSES IN'

    const secsLeft = Math.floor((target - now) / 1000)
    if (secsLeft <= 0) return { label: null, time: null, urgent: false }

    const h = String(Math.floor(secsLeft / 3600)).padStart(2, '0')
    const m = String(Math.floor((secsLeft % 3600) / 60)).padStart(2, '0')
    const s = String(secsLeft % 60).padStart(2, '0')

    return { label, time: `${h}:${m}:${s}`, urgent: phase === 'open' && secsLeft < 3600 }
  }

  const [countdown, setCountdown] = useState(compute)

  useEffect(() => {
    if (!todayDoomDate) return
    const id = setInterval(() => setCountdown(compute()), 1000)
    return () => clearInterval(id)
  }, [todayDoomDate])

  return countdown
}
```

- [ ] **Step 2: 개발 서버 기동 확인**

```bash
cd edi-frontend && npm run dev
```

브라우저에서 페이지가 정상 로드되는지 확인. 콘솔 에러 없어야 함. (훅은 아직 아무 곳에도 연결되지 않으므로 화면 변화 없음)

- [ ] **Step 3: 커밋**

```bash
git add edi-frontend/src/App.jsx
git commit -m "feat: add useVoteCountdown hook"
```

---

### Task 2: `VoteTimerChip` 컴포넌트 + CSS 스타일

**Files:**
- Modify: `edi-frontend/src/App.jsx` — `VoteBar` 컴포넌트(line 188) 바로 뒤에 삽입
- Modify: `edi-frontend/src/App.css` — line 298 (모바일 미디어쿼리 블록 앞) 에 삽입

- [ ] **Step 1: `VoteTimerChip` 컴포넌트 삽입**

`edi-frontend/src/App.jsx`에서 `VoteBar` 함수 끝(`}`) 바로 다음 빈 줄 뒤에 삽입:

```jsx
function VoteTimerChip({ label, time, urgent }) {
  if (!label) return null
  return (
    <div className={`vote-timer-chip${urgent ? ' warn' : ''}`}>
      <span className="vote-timer-label">{label}</span>
      <span className="vote-timer-time">{time}</span>
    </div>
  )
}
```

- [ ] **Step 2: CSS 스타일 추가**

`edi-frontend/src/App.css`의 `/* 모바일 */` 주석(line 299) 바로 앞에 삽입:

```css
/* ───── 투표 타임 칩 ───── */
.vote-question-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
}

.vote-question-row .vote-question {
  margin-bottom: 0 !important;
  flex: 1;
}

.vote-timer-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  border: 2px solid #92cc41;
  color: #92cc41;
  padding: 4px 8px;
  line-height: 1.6;
  white-space: nowrap;
  flex-shrink: 0;
}

.vote-timer-chip.warn {
  border-color: #f7d51d;
  color: #f7d51d;
}

.vote-timer-label {
  font-size: 7px !important;
  color: inherit;
  opacity: 0.8;
}

.vote-timer-time {
  font-size: 10px !important;
  color: inherit;
}
```

- [ ] **Step 3: 브라우저 확인**

개발 서버에서 페이지가 정상 로드. 콘솔 에러 없음. 아직 화면 변화 없음.

- [ ] **Step 4: 커밋**

```bash
git add edi-frontend/src/App.jsx edi-frontend/src/App.css
git commit -m "feat: add VoteTimerChip component and styles"
```

---

### Task 3: VoteSection에 카운트다운 연결

**Files:**
- Modify: `edi-frontend/src/App.jsx` — `VoteSection` 함수(lines 211–284) 전체 수정

- [ ] **Step 1: 훅 호출 + 가드 조건 변경**

`VoteSection` 함수 상단(line 213, `const t = ...` 다음)에 `countdown` 호출 추가, 가드 조건 변경:

현재:
```jsx
const { myVote, phase, showBallot, setShowBallot, castVote, voteData, loading } = useVote(todayDoomDate)

if (!phase || phase === 'pending' || loading) return null
```

변경 후:
```jsx
const { myVote, phase, showBallot, setShowBallot, castVote, voteData, loading } = useVote(todayDoomDate)
const countdown = useVoteCountdown(todayDoomDate)

if (!phase || (phase === 'pending' && countdown.label === null) || loading) return null
```

- [ ] **Step 2: pending-today 브랜치 추가**

가드 바로 다음(`const counts = ...` 이전)에 삽입:

```jsx
// 투표 오픈 대기 (오늘 pending, UTC 00:00~00:04)
if (phase === 'pending') {
  return (
    <section className="nes-container is-dark with-title vote-section">
      <p className="title">🎰 {t.title}</p>
      <div className="vote-question-row">
        <p className="vote-question">{t.question}</p>
        <VoteTimerChip {...countdown} />
      </div>
    </section>
  )
}
```

- [ ] **Step 3: open 투표 전 브랜치에 칩 추가**

기존 투표 전/재투표 브랜치의 `<p className="vote-question">` 부분을 `.vote-question-row`로 감싸기:

현재:
```jsx
<p className="title">🎰 {t.title}</p>
<p className="vote-question">{t.question}</p>
<div className="vote-buttons">
```

변경 후:
```jsx
<p className="title">🎰 {t.title}</p>
<div className="vote-question-row">
  <p className="vote-question">{t.question}</p>
  <VoteTimerChip {...countdown} />
</div>
<div className="vote-buttons">
```

- [ ] **Step 4: open 투표 후 결과 뷰에 칩 추가**

`myVote && !showBallot` 브랜치의 `<div className="vote-result-body">` 안 첫 줄에 칩 삽입:

현재:
```jsx
<div className="vote-result-body">
  <VoteBar label="▲ UP" ...
```

변경 후:
```jsx
<div className="vote-result-body">
  <VoteTimerChip {...countdown} />
  <VoteBar label="▲ UP" ...
```

- [ ] **Step 5: 브라우저에서 각 상태 확인**

`open` 상태는 평상시에 확인 가능. 나머지 상태는 `getVotePhase`를 임시로 override해서 테스트:

**open 상태 확인 (평상시):**
- 투표 섹션에 `VOTE CLOSES IN HH:MM:SS` 칩이 질문 우측에 표시
- 매초 숫자가 바뀜
- 투표 후 결과 뷰에서도 칩이 vote-result-body 상단에 표시

**pending-today 상태 확인 (App.jsx에서 임시 테스트):**

`getVotePhase` 함수의 반환값을 임시로 바꿔 테스트:
```js
// 테스트 직전 line 72 근처에 임시 추가
// function getVotePhase(...) { return 'pending' }
```
`todayDoomDate`를 오늘 날짜로 맞춘 상태에서 `pending`이 반환되면 → 칩만 표시, 투표 버튼 없어야 함.
테스트 후 원상복구.

**urgent 색상 확인:**
`useVoteCountdown`에서 `secsLeft < 3600` 조건을 임시로 `secsLeft < 99999`로 바꾸면 노랑 칩으로 확인 가능. 테스트 후 원상복구.

- [ ] **Step 6: 커밋**

```bash
git add edi-frontend/src/App.jsx
git commit -m "feat: wire VoteTimerChip into VoteSection with countdown"
```
