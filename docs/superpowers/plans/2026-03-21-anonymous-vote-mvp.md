# Anonymous Vote MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "내일 점수가 UP / FLAT / DOWN?" 익명 투표 기능을 추가한다. 백엔드에 votes 테이블과 3개 API 엔드포인트, 프론트엔드에 VoteSection 컴포넌트를 구현한다.

**Architecture:** 백엔드에 `votes` 테이블을 추가하고 `db/index.js`에 DB 함수, `routes/doom.js`에 3개 엔드포인트를 추가한다. 프론트엔드는 `App.jsx`에 `getVotePhase`, `useVote`, `VoteSection`을 추가하고 AI 코멘터리 아래에 삽입한다. 중복 방지는 로컬스토리지로 처리한다.

**Tech Stack:** Node.js/Express, PostgreSQL, React + Vite, NES.css

**Spec:** `docs/superpowers/specs/2026-03-21-anonymous-vote-mvp-design.md`

---

## 파일 구조

| 파일 | 변경 내용 |
|------|-----------|
| `edi-backend/db/index.js` | `votes` 테이블 init + 4개 DB 함수 추가 |
| `edi-backend/routes/doom.js` | `POST /api/vote`, `DELETE /api/vote`, `GET /api/vote/today` 추가 |
| `edi-frontend/src/i18n.js` | `vote` 번역 키 추가 (KO/EN) |
| `edi-frontend/src/App.jsx` | `getVotePhase` + `useVote` hook + `VoteSection` 컴포넌트 추가, 레이아웃 삽입 |
| `edi-frontend/src/App.css` | VoteSection 스타일 추가 |

---

## Task 1: DB — votes 테이블 및 DB 함수 추가

**Files:**
- Modify: `edi-backend/db/index.js`

### votes 테이블 정의 (참고)

```sql
CREATE TABLE IF NOT EXISTS votes (
  id          SERIAL PRIMARY KEY,
  target_date DATE NOT NULL,   -- 예측 대상 날짜 (투표일 + 1일, 즉 내일)
  direction   VARCHAR(4) NOT NULL,  -- 'up' | 'flat' | 'down'
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_votes_target_date ON votes (target_date);
```

- [ ] **Step 1: `initDB()`에 votes 테이블 생성 구문 추가**

`edi-backend/db/index.js`의 `initDB()` 함수 내 `ai_commentary_en` ALTER TABLE 구문 아래에 추가:

```js
await pool.query(`
  CREATE TABLE IF NOT EXISTS votes (
    id          SERIAL PRIMARY KEY,
    target_date DATE NOT NULL,
    direction   VARCHAR(4) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);
await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_votes_target_date ON votes (target_date)
`);
```

- [ ] **Step 2: `saveVote` 함수 추가**

`saveDoomRecord` 함수 아래에 추가:

```js
// direction: 'up' | 'flat' | 'down'
const saveVote = async (targetDate, direction) => {
  await pool.query(
    'INSERT INTO votes (target_date, direction) VALUES ($1, $2)',
    [targetDate, direction]
  );
};
```

- [ ] **Step 3: `deleteVote` 함수 추가**

```js
// 재투표 시 이전 투표 1건 제거 (LIMIT 1 시뮬레이션)
const deleteVote = async (targetDate, direction) => {
  await pool.query(
    `DELETE FROM votes WHERE id = (
       SELECT id FROM votes
       WHERE target_date = $1 AND direction = $2
       LIMIT 1
     )`,
    [targetDate, direction]
  );
};
```

- [ ] **Step 4: `getVotesToday` 함수 추가**

```js
// 해당 날짜 투표 집계 반환 → { up: N, flat: N, down: N }
const getVotesToday = async (targetDate) => {
  const result = await pool.query(
    `SELECT direction, COUNT(*) AS count
     FROM votes
     WHERE target_date = $1
     GROUP BY direction`,
    [targetDate]
  );
  const counts = { up: 0, flat: 0, down: 0 };
  for (const row of result.rows) {
    counts[row.direction] = parseInt(row.count, 10);
  }
  return counts;
};
```

- [ ] **Step 5: `getYesterdayVoteResult` 함수 추가**

```js
// yesterdayVoteTargetDate: 어제 투표자들이 예측했던 날짜 (= 오늘 UTC 날짜)
// todayDate: 오늘 doom_records 날짜
// yesterdayDate: 어제 doom_records 날짜
const getYesterdayVoteResult = async (yesterdayVoteTargetDate, todayDate, yesterdayDate) => {
  // 어제 투표 집계
  const voteCounts = await getVotesToday(yesterdayVoteTargetDate);
  const total = voteCounts.up + voteCounts.flat + voteCounts.down;
  if (total === 0) return null;

  // 최다 득표 방향 (동률 우선순위: up > flat > down)
  const prediction = (['up', 'flat', 'down']).reduce((best, dir) =>
    voteCounts[dir] > voteCounts[best] ? dir : best
  , 'up');

  // 실제 결과: today vs yesterday doom_records 비교
  const scoreResult = await pool.query(
    `SELECT target_date, total_score
     FROM doom_records
     WHERE target_date = ANY($1::date[])`,
    [[todayDate, yesterdayDate]]
  );
  const scores = {};
  for (const row of scoreResult.rows) {
    scores[row.target_date.toISOString().slice(0, 10)] = row.total_score;
  }

  const todayScore = scores[todayDate] ?? null;
  const yestScore = scores[yesterdayDate] ?? null;

  let actual = null;
  if (todayScore !== null && yestScore !== null) {
    if (todayScore > yestScore) actual = 'up';
    else if (todayScore < yestScore) actual = 'down';
    else actual = 'flat';
  }

  return {
    target_date: yesterdayVoteTargetDate,
    ...voteCounts,
    prediction,
    actual,
    correct: actual !== null ? prediction === actual : null,
  };
};
```

- [ ] **Step 6: `module.exports`에 새 함수 4개 추가**

기존 `module.exports` 줄을 아래로 교체:

```js
module.exports = {
  pool, initDB, getDoomToday, getDoomHistory, saveDoomRecord,
  saveVote, deleteVote, getVotesToday, getYesterdayVoteResult,
};
```

- [ ] **Step 7: 서버 재시작 후 votes 테이블 생성 확인**

```bash
cd edi-backend
docker compose restart edi-api
docker compose logs edi-api | grep "DB Schema"
```

예상 출력: `✅ DB Schema is ready.` (에러 없음)

- [ ] **Step 8: Commit**

```bash
git add edi-backend/db/index.js
git commit -m "feat: add votes table and DB functions (saveVote, deleteVote, getVotesToday, getYesterdayVoteResult)"
```

---

## Task 2: 백엔드 라우트 — 3개 엔드포인트 추가

**Files:**
- Modify: `edi-backend/routes/doom.js`

- [ ] **Step 1: `doom.js` 상단 import에 새 DB 함수 추가**

기존:
```js
const { getDoomToday, getDoomHistory } = require('../db');
```

변경:
```js
const { getDoomToday, getDoomHistory, saveVote, deleteVote, getVotesToday, getYesterdayVoteResult } = require('../db');
```

- [ ] **Step 2: 유효성 검사 헬퍼 추가**

`module.exports = router;` 바로 위에 추가할 내용을 라우트 정의 전에 파일 상단(import 아래)에 추가:

```js
const VALID_DIRECTIONS = new Set(['up', 'flat', 'down']);

function isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
}
```

- [ ] **Step 3: `POST /api/vote` 추가**

`module.exports = router;` 바로 위에 추가:

```js
// 투표 저장. direction: 'up'|'flat'|'down', target_date: 'YYYY-MM-DD'
router.post('/vote', async (req, res) => {
  const { direction, target_date } = req.body;
  if (!VALID_DIRECTIONS.has(direction) || !isValidDate(target_date)) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  try {
    await saveVote(target_date, direction);
    const counts = await getVotesToday(target_date);
    res.status(201).json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});
```

- [ ] **Step 4: `DELETE /api/vote` 추가**

```js
// 재투표 시 이전 투표 1건 제거
router.delete('/vote', async (req, res) => {
  const { direction, target_date } = req.body;
  if (!VALID_DIRECTIONS.has(direction) || !isValidDate(target_date)) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  try {
    await deleteVote(target_date, direction);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});
```

- [ ] **Step 5: `GET /api/vote/today` 추가**

```js
// 오늘 투표 집계 + 어제 예측 결과 반환
router.get('/vote/today', async (req, res) => {
  try {
    // 서버 UTC 기준 오늘/어제 날짜 계산
    const now = new Date();
    const todayUTC = now.toISOString().slice(0, 10);            // 오늘 doom 날짜
    const voteTargetDate = new Date(now.getTime() + 86400000)   // 오늘 투표 대상 (내일)
      .toISOString().slice(0, 10);
    const yesterdayUTC = new Date(now.getTime() - 86400000)     // 어제 doom 날짜
      .toISOString().slice(0, 10);

    const counts = await getVotesToday(voteTargetDate);
    // yesterdayVoteTargetDate = todayUTC (어제 투표자들이 오늘을 예측했음)
    const yesterday = await getYesterdayVoteResult(todayUTC, todayUTC, yesterdayUTC);

    res.json({
      target_date: voteTargetDate,
      ...counts,
      yesterday,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});
```

- [ ] **Step 6: 엔드포인트 수동 테스트**

서버가 실행 중인 상태에서:

```bash
# POST 투표
curl -s -X POST http://localhost:3000/api/vote \
  -H "Content-Type: application/json" \
  -d '{"direction":"up","target_date":"2026-03-22"}' | cat
# 예상: {"up":1,"flat":0,"down":0}

# GET 집계
curl -s http://localhost:3000/api/vote/today | cat
# 예상: {"target_date":"2026-03-22","up":1,"flat":0,"down":0,"yesterday":null}

# DELETE (재투표)
curl -s -o /dev/null -w "%{http_code}" -X DELETE http://localhost:3000/api/vote \
  -H "Content-Type: application/json" \
  -d '{"direction":"up","target_date":"2026-03-22"}'
# 예상: 204

# 잘못된 입력 검증
curl -s -X POST http://localhost:3000/api/vote \
  -H "Content-Type: application/json" \
  -d '{"direction":"sideways","target_date":"2026-03-22"}' | cat
# 예상: {"error":"Invalid input"}
```

- [ ] **Step 7: Commit**

```bash
git add edi-backend/routes/doom.js
git commit -m "feat: add POST/DELETE /api/vote and GET /api/vote/today endpoints"
```

---

## Task 3: i18n — vote 번역 키 추가

**Files:**
- Modify: `edi-frontend/src/i18n.js`

버튼 라벨(`UP`, `FLAT`, `DOWN`)은 픽셀 폰트 한글 미지원으로 KO/EN 모두 영어 고정.
안내 문구와 상태 메시지만 번역.

- [ ] **Step 1: KO 번역에 `vote` 키 추가**

`ko` 객체의 `termsContent` 배열 뒤에 추가:

```js
vote: {
  title: 'TOMORROW\'S PREDICTION',
  question: '\ub0b4\uc77c \uba78\ub9dd \uc9c0\uc218?',
  changeVote: 'CHANGE VOTE',
  closed: 'VOTING CLOSED \u2014 RESULTS TOMORROW',
  resultTitle: 'YESTERDAY\'S RESULT',
  correct: 'CORRECT',
  wrong: 'WRONG',
  totalVoters: (n) => `${n}\uba85 \uc608\uce21`,
  predictionLabel: (dir, pct) => `${dir === 'up' ? '\u25b2 UP' : dir === 'flat' ? '\u2014 FLAT' : '\u25bd DOWN'} ${pct}%`,
},
```

> 한글 문자열 참고: `내일 멸망 지수?` = `\ub0b4\uc77c \uba78\ub9dd \uc9c0\uc218?`, `명 예측` = `\uba85 \uc608\uce21`
> 픽셀 폰트가 한글을 지원하지 않으므로, 실제로 한글이 깨진다면 아래 EN 버전처럼 영어로 교체한다.

실용적 대안 (한글 깨짐 방지 — 두 언어 모두 영어로):
```js
// ko.vote
vote: {
  title: 'TOMORROW\'S PREDICTION',
  question: 'TOMORROW\'S DOOM?',
  changeVote: 'CHANGE VOTE',
  closed: 'VOTING CLOSED \u2014 RESULTS TOMORROW',
  resultTitle: 'YESTERDAY\'S RESULT',
  correct: 'CORRECT',
  wrong: 'WRONG',
  totalVoters: (n) => `${n} VOTES`,
},
```

- [ ] **Step 2: EN 번역에 `vote` 키 추가**

`en` 객체의 `termsContent` 배열 뒤에 추가:

```js
vote: {
  title: 'TOMORROW\'S PREDICTION',
  question: 'TOMORROW\'S DOOM?',
  changeVote: 'CHANGE VOTE',
  closed: 'VOTING CLOSED \u2014 RESULTS TOMORROW',
  resultTitle: 'YESTERDAY\'S RESULT',
  correct: 'CORRECT',
  wrong: 'WRONG',
  totalVoters: (n) => `${n} VOTES`,
},
```

- [ ] **Step 3: Commit**

```bash
git add edi-frontend/src/i18n.js
git commit -m "feat: add vote i18n keys to KO and EN translations"
```

---

## Task 4: 프론트엔드 — getVotePhase + useVote + VoteSection

**Files:**
- Modify: `edi-frontend/src/App.jsx`

이 Task는 크므로 Step별로 작성한다. App.jsx는 함수들이 파일 상단에 순서대로 선언돼 있다.

### 삽입 위치 요약
- `getVotePhase` 함수: `dangerLevel` 함수 아래
- `useVote` hook: `useLang` hook 아래
- `VoteSection` 컴포넌트: `TopNav` 컴포넌트 아래
- `<VoteSection>` 렌더: App() 내 commentary-section 아래

---

- [ ] **Step 1: `getVotePhase` 함수 추가**

`dangerLevel` 함수 아래, `useLang` hook 위에 삽입:

```jsx
// todayDoomDate: data.target_date (서버 기준 오늘 날짜, 'YYYY-MM-DD')
// 반환: 'pending' | 'open' | 'closed' | 'result'
function getVotePhase(todayDoomDate) {
  const now = new Date()
  const todayUTC = now.toISOString().slice(0, 10)

  if (todayDoomDate < todayUTC) return 'pending'   // 새 점수 미계산
  if (todayDoomDate > todayUTC) return 'result'    // 다음날 이후

  // todayDoomDate === todayUTC
  const utcHour = now.getUTCHours()
  const utcMin = now.getUTCMinutes()
  const totalMin = utcHour * 60 + utcMin
  if (totalMin < 5) return 'pending'               // 00:00~00:04 (계산 중)
  if (totalMin >= 23 * 60 + 59) return 'closed'   // 23:59 이후
  return 'open'
}
```

- [ ] **Step 2: `useVote` hook 추가**

`useLang` hook 아래에 삽입:

```jsx
const VOTE_BASE_URL = `${BASE_URL}/api/vote`

function useVote(todayDoomDate) {
  const phase = todayDoomDate ? getVotePhase(todayDoomDate) : null

  // 투표 대상 날짜 = 오늘 doom 날짜 + 1일
  const voteTargetDate = todayDoomDate
    ? new Date(new Date(todayDoomDate).getTime() + 86400000).toISOString().slice(0, 10)
    : null

  const storageKey = voteTargetDate ? `edi-vote-${voteTargetDate}` : null

  const [myVote, setMyVote] = useState(() =>
    storageKey ? localStorage.getItem(storageKey) : null
  )
  const [showBallot, setShowBallot] = useState(false)
  const [voteData, setVoteData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${VOTE_BASE_URL}/today`)
      .then(res => res.ok ? res.json() : null)
      .then(json => setVoteData(json))
      .catch(() => setVoteData(null))
      .finally(() => setLoading(false))
  }, [])

  const castVote = async (direction) => {
    // 재투표 시 이전 표 제거
    if (myVote && myVote !== direction) {
      await fetch(VOTE_BASE_URL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: myVote, target_date: voteTargetDate }),
      })
    }
    const res = await fetch(VOTE_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction, target_date: voteTargetDate }),
    })
    if (res.ok) {
      const counts = await res.json()
      setVoteData(prev => prev ? { ...prev, ...counts } : counts)
      localStorage.setItem(storageKey, direction)
      setMyVote(direction)
      setShowBallot(false)
    }
  }

  return { myVote, phase, showBallot, setShowBallot, castVote, voteData, loading }
}
```

- [ ] **Step 3: `VoteSection` 컴포넌트 추가**

`TopNav` 컴포넌트 위에 삽입:

```jsx
function VoteBar({ label, count, total, isMyVote }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className={`vote-bar-row${isMyVote ? ' vote-bar-mine' : ''}`}>
      <span className="vote-bar-label">{label}</span>
      <div className="vote-bar-track">
        <div className="vote-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="vote-bar-pct">{pct}%</span>
      {isMyVote && <span className="vote-bar-mark">◀</span>}
    </div>
  )
}

function VoteSection({ todayDoomDate, lang }) {
  const t = translations[lang].vote
  const { myVote, phase, showBallot, setShowBallot, castVote, voteData, loading } = useVote(todayDoomDate)

  if (!phase || phase === 'pending' || loading) return null

  const counts = voteData ?? { up: 0, flat: 0, down: 0 }
  const total = (counts.up ?? 0) + (counts.flat ?? 0) + (counts.down ?? 0)

  // 결과 표시 (phase=result) — 어제 결과 + 오늘 새 투표 버튼 함께 표시
  if (phase === 'result') {
    const y = voteData?.yesterday
    const pct = (dir) => y && (y.up + y.flat + y.down) > 0
      ? Math.round((y[dir] / (y.up + y.flat + y.down)) * 100)
      : 0
    return (
      <>
        <section className="nes-container is-dark with-title vote-section">
          <p className="title">📊 {t.resultTitle}</p>
          {y ? (
            <div className="vote-result-body">
              <p className="vote-result-summary">
                {y.prediction === 'up' ? `▲ UP ${pct('up')}%` : y.prediction === 'flat' ? `— FLAT ${pct('flat')}%` : `▽ DOWN ${pct('down')}%`}
                {' → '}
                {y.actual === 'up' ? '▲ UP' : y.actual === 'flat' ? '— FLAT' : y.actual === 'down' ? '▽ DOWN' : '—'}
              </p>
              <p className={`vote-result-verdict nes-text ${y.correct ? 'is-success' : 'is-error'}`}>
                {y.correct === true ? `✓ ${t.correct}` : y.correct === false ? `✗ ${t.wrong}` : '—'}
              </p>
            </div>
          ) : (
            <p className="vote-no-data">—</p>
          )}
        </section>
        {/* 오늘 새 투표 UI (phase=result이면서 오늘 투표 가능 시간대) */}
        <section className="nes-container is-dark with-title vote-section">
          <p className="title">🎰 {t.title}</p>
          <p className="vote-question">{t.question}</p>
          <div className="vote-buttons">
            <button className={`nes-btn ${myVote === 'up' ? 'is-primary' : ''} vote-btn`} onClick={() => castVote('up')}>▲ UP</button>
            <button className={`nes-btn ${myVote === 'flat' ? 'is-primary' : ''} vote-btn`} onClick={() => castVote('flat')}>— FLAT</button>
            <button className={`nes-btn ${myVote === 'down' ? 'is-primary' : ''} vote-btn`} onClick={() => castVote('down')}>▽ DOWN</button>
          </div>
        </section>
      </>
    )
  }

  // 투표 마감 (phase=closed)
  if (phase === 'closed') {
    return (
      <section className="nes-container is-dark with-title vote-section">
        <p className="title">🎰 {t.title}</p>
        <div className="vote-closed-body">
          <VoteBar label="▲ UP"   count={counts.up}   total={total} isMyVote={myVote === 'up'} />
          <VoteBar label="— FLAT" count={counts.flat} total={total} isMyVote={myVote === 'flat'} />
          <VoteBar label="▽ DOWN" count={counts.down} total={total} isMyVote={myVote === 'down'} />
          <p className="vote-closed-msg nes-text is-warning">{t.closed}</p>
        </div>
      </section>
    )
  }

  // 투표 후 결과 뷰 (phase=open, myVote 있음, showBallot=false)
  if (myVote && !showBallot) {
    return (
      <section className="nes-container is-dark with-title vote-section">
        <p className="title">🎰 {t.title}</p>
        <div className="vote-result-body">
          <VoteBar label="▲ UP"   count={counts.up}   total={total} isMyVote={myVote === 'up'} />
          <VoteBar label="— FLAT" count={counts.flat} total={total} isMyVote={myVote === 'flat'} />
          <VoteBar label="▽ DOWN" count={counts.down} total={total} isMyVote={myVote === 'down'} />
          <p className="vote-total">{t.totalVoters(total)}</p>
          <button className="nes-btn is-warning vote-change-btn" onClick={() => setShowBallot(true)}>
            {t.changeVote}
          </button>
        </div>
      </section>
    )
  }

  // 투표 전 / 재투표 화면 (phase=open)
  return (
    <section className="nes-container is-dark with-title vote-section">
      <p className="title">🎰 {t.title}</p>
      <p className="vote-question">{t.question}</p>
      <div className="vote-buttons">
        <button
          className={`nes-btn ${myVote === 'up' ? 'is-primary' : ''} vote-btn`}
          onClick={() => castVote('up')}
        >▲ UP</button>
        <button
          className={`nes-btn ${myVote === 'flat' ? 'is-primary' : ''} vote-btn`}
          onClick={() => castVote('flat')}
        >— FLAT</button>
        <button
          className={`nes-btn ${myVote === 'down' ? 'is-primary' : ''} vote-btn`}
          onClick={() => castVote('down')}
        >▽ DOWN</button>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: App()에서 `useVote` 호출 제거 확인 및 VoteSection 삽입**

`useVote`는 `VoteSection` 내부에서 호출되므로 App()에서 별도 호출 불필요.

App() 내 commentary-section 닫는 태그 `</section>` 바로 아래에 삽입:

```jsx
{/* 투표 섹션 */}
<VoteSection todayDoomDate={data.target_date} lang={lang} />
```

- [ ] **Step 5: Commit**

```bash
git add edi-frontend/src/App.jsx
git commit -m "feat: add getVotePhase, useVote hook, VoteSection component"
```

---

## Task 5: CSS — VoteSection 스타일 추가

**Files:**
- Modify: `edi-frontend/src/App.css`

`site-footer` 스타일 위에 추가:

- [ ] **Step 1: VoteSection 스타일 추가**

```css
/* ───── 투표 섹션 ───── */
.vote-section {
  margin-bottom: 16px;
}

.vote-question {
  font-size: 9px !important;
  color: #aaa;
  margin-bottom: 16px !important;
}

.vote-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.vote-btn {
  font-size: 9px !important;
  min-width: 72px;
}

/* 투표 결과 바 */
.vote-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 8px !important;
}

.vote-bar-label {
  width: 52px;
  flex-shrink: 0;
  color: #ccc;
}

.vote-bar-track {
  flex: 1;
  height: 8px;
  background: #333;
  border: 1px solid #555;
}

.vote-bar-fill {
  height: 100%;
  background: #e76e55;
  transition: width 0.3s ease;
}

.vote-bar-pct {
  width: 32px;
  text-align: right;
  color: #aaa;
}

.vote-bar-mark {
  color: #92cc41;
  flex-shrink: 0;
}

.vote-bar-mine .vote-bar-label {
  color: #92cc41;
}

.vote-total {
  font-size: 8px !important;
  color: #888;
  margin-top: 8px !important;
  text-align: right;
}

.vote-change-btn {
  font-size: 8px !important;
  margin-top: 12px;
  display: block;
  width: 100%;
}

.vote-closed-msg {
  font-size: 8px !important;
  margin-top: 12px !important;
  letter-spacing: 1px;
}

.vote-result-summary {
  font-size: 9px !important;
  color: #ccc;
  margin-bottom: 8px !important;
}

.vote-result-verdict {
  font-size: 11px !important;
  letter-spacing: 2px;
}

/* 모바일 */
@media (max-width: 600px) {
  .vote-buttons {
    flex-direction: column;
    align-items: stretch;
  }
  .vote-btn {
    width: 100%;
  }
}
```

- [ ] **Step 2: 브라우저에서 확인**

`npm run dev` 후:
1. VoteSection이 AI 코멘터리 아래에 표시되는지 확인
2. UP / FLAT / DOWN 버튼 클릭 → 선택 버튼 `is-primary` 강조 확인
3. 투표 후 결과 바 표시 + CHANGE VOTE 버튼 확인
4. CHANGE VOTE 클릭 → 이전 선택 강조된 투표 화면 복귀 확인
5. 새로고침 시 투표 상태 유지 확인 (로컬스토리지)
6. 모바일 뷰 확인

- [ ] **Step 3: Commit**

```bash
git add edi-frontend/src/App.css
git commit -m "feat: add VoteSection styles"
```

---

## Task 6: 최종 통합 검증

- [ ] **Step 1: 백엔드 + 프론트엔드 연동 확인**

백엔드 실행 상태에서 프론트엔드 `VITE_API_URL` 설정 후 실제 API 호출 확인:
- 투표 → DB에 실제 저장되는지 `docker compose exec edi-db psql -U $DB_USER -d $DB_NAME -c "SELECT * FROM votes ORDER BY created_at DESC LIMIT 5;"` 로 확인
- 재투표 → votes 테이블에서 이전 표 삭제, 새 표 추가 확인

- [ ] **Step 2: phase 상태 수동 테스트**

`getVotePhase`의 `pending` 케이스 테스트: `data.target_date`를 어제 날짜로 임시 하드코딩 후 VoteSection이 숨겨지는지 확인. 확인 후 원복.

- [ ] **Step 3: 최종 Commit**

```bash
git add -A
git commit -m "feat: anonymous vote MVP — UP/FLAT/DOWN prediction with re-vote and phase control"
```
