# EDI Backend 리팩토링 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `index.js`에 혼재된 DB·라우트·스케줄러·비즈니스 로직을 역할별 파일로 분리해 유지보수성을 높인다.

**Architecture:** `db/index.js`가 DB Pool과 쿼리를 캡슐화하고, `routes/doom.js`가 HTTP 레이어를 담당하며, `scheduler.js`가 비즈니스 로직과 크론 등록을 분리 export한다. 서비스 파일 전체는 `services/` 폴더로 이동하고, `gdeltService.js`는 `societyService.js`로 개명한다.

**Tech Stack:** Node.js, Express.js v5, PostgreSQL (`pg`), `node-cron`, `axios`, `dotenv`

---

## 파일 변경 맵

| 파일 | 유형 |
|------|------|
| `edi-backend/db/index.js` | 신규 생성 |
| `edi-backend/routes/doom.js` | 신규 생성 |
| `edi-backend/scheduler.js` | 신규 생성 |
| `edi-backend/services/societyService.js` | 이동 + 파일명 변경 (`gdeltService.js`) |
| `edi-backend/services/climateService.js` | 이동 |
| `edi-backend/services/economyService.js` | 이동 |
| `edi-backend/services/solarService.js` | 이동 |
| `edi-backend/services/aiService.js` | 이동 |
| `edi-backend/index.js` | 수정 (슬림화) |
| `edi-backend/testRunner.js` | 수정 (중복 제거) |

> **참고:** 모든 작업은 `edi-backend/` 디렉토리에서 실행합니다.

---

## Task 1: 서비스 파일을 `services/` 폴더로 이동

**Files:**
- Create dir: `edi-backend/services/`
- Move + rename: `gdeltService.js` → `services/societyService.js`
- Move: `climateService.js`, `economyService.js`, `solarService.js`, `aiService.js` → `services/`

> **참고:** 이 단계에서는 `cp`로 복사하며, 루트의 구버전 파일은 Task 7에서 삭제합니다. Task 2~6 실행 중 루트에 구버전 파일이 남아 있는 것은 정상입니다.

- [ ] **Step 1: `services/` 디렉토리 생성**

```bash
cd edi-backend
mkdir services
```

- [ ] **Step 2: `gdeltService.js`를 `societyService.js`로 복사**

```bash
cp gdeltService.js services/societyService.js
```

- [ ] **Step 3: `societyService.js` 파일 상단 주석 업데이트**

`services/societyService.js` 첫 줄을 아래와 같이 변경:

```js
// societyService.js
```

- [ ] **Step 4: 나머지 서비스 파일 복사**

```bash
cp climateService.js services/climateService.js
cp economyService.js services/economyService.js
cp solarService.js services/solarService.js
cp aiService.js services/aiService.js
```

- [ ] **Step 5: 각 파일 문법 검증**

```bash
node --check services/societyService.js
node --check services/climateService.js
node --check services/economyService.js
node --check services/solarService.js
node --check services/aiService.js
```

기대 결과: 출력 없이 종료 (문법 오류 없음)

---

## Task 2: `db/index.js` 생성

**Files:**
- Create: `edi-backend/db/index.js`

- [ ] **Step 1: `db/` 디렉토리 생성 및 `db/index.js` 작성**

```bash
mkdir db
```

`edi-backend/db/index.js` 파일 전체 내용:

```js
// db/index.js
// DB 연결 풀을 관리하고, doom_records 테이블의 CRUD 함수를 제공합니다.
// Pool은 싱글톤으로 export되며 모든 모듈이 동일 인스턴스를 공유합니다.
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// doom_records 테이블 생성 및 solar_score 컬럼 마이그레이션 (서버 시작 시 1회 실행)
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS doom_records (
      id SERIAL PRIMARY KEY,
      target_date DATE UNIQUE NOT NULL,
      climate_score INTEGER NOT NULL,
      economy_score INTEGER NOT NULL,
      society_score INTEGER NOT NULL,
      total_score INTEGER NOT NULL,
      ai_commentary TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // 기존 테이블에 solar_score 컬럼이 없을 경우 자동 추가
  await pool.query(`
    ALTER TABLE doom_records
    ADD COLUMN IF NOT EXISTS solar_score INTEGER NOT NULL DEFAULT 0
  `);
  console.log('✅ DB Schema is ready.');
};

// 가장 최근에 저장된 doom 기록 1건 반환 (없으면 null)
const getDoomToday = async () => {
  const result = await pool.query(
    'SELECT * FROM doom_records ORDER BY target_date DESC LIMIT 1'
  );
  return result.rows[0] ?? null;
};

// 최근 days일 doom 기록을 오래된 순으로 반환
const getDoomHistory = async (days) => {
  const result = await pool.query(
    `SELECT target_date, society_score, climate_score, economy_score, solar_score, total_score
     FROM doom_records
     ORDER BY target_date DESC
     LIMIT $1`,
    [days]
  );
  return result.rows.reverse();
};

// target_date 기준 UPSERT — 당일 중복 실행 시 기존 기록 전체 갱신
const saveDoomRecord = async ({
  targetDate,
  societyScore,
  climateScore,
  economyScore,
  solarScore,
  totalScore,
  commentary,
}) => {
  await pool.query(
    `INSERT INTO doom_records
       (target_date, society_score, climate_score, economy_score, solar_score, total_score, ai_commentary)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (target_date) DO UPDATE SET
       society_score = EXCLUDED.society_score,
       climate_score = EXCLUDED.climate_score,
       economy_score = EXCLUDED.economy_score,
       solar_score   = EXCLUDED.solar_score,
       total_score   = EXCLUDED.total_score,
       ai_commentary = EXCLUDED.ai_commentary`,
    [targetDate, societyScore, climateScore, economyScore, solarScore, totalScore, commentary]
  );
};

module.exports = { pool, initDB, getDoomToday, getDoomHistory, saveDoomRecord };
```

- [ ] **Step 2: 문법 검증**

```bash
node --check db/index.js
```

기대 결과: 출력 없이 종료

---

## Task 3: `routes/doom.js` 생성

**Files:**
- Create: `edi-backend/routes/doom.js`

- [ ] **Step 1: `routes/` 디렉토리 생성 및 `routes/doom.js` 작성**

```bash
mkdir routes
```

`edi-backend/routes/doom.js` 파일 전체 내용:

```js
// routes/doom.js
// /api/today-doom, /api/doom-history 엔드포인트 핸들러를 정의합니다.
// HTTP 레이어만 담당하며, DB 쿼리는 db 모듈의 함수를 통해 실행합니다.
const { Router } = require('express');
const { getDoomToday, getDoomHistory } = require('../db');

const router = Router();

// 가장 최근에 계산된 멸망 지수 1건 반환
router.get('/today-doom', async (_req, res) => {
  try {
    const record = await getDoomToday();
    if (!record) {
      return res.json({ message: '아직 계산된 멸망 지수가 없습니다.' });
    }
    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// 최근 N일(기본 7, 최대 30) 멸망 지수 이력을 오래된 순으로 반환
router.get('/doom-history', async (req, res) => {
  try {
    let days = parseInt(req.query.days, 10);
    if (!days || days <= 0) days = 7;
    if (days > 30) days = 30;

    const rows = await getDoomHistory(days);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

module.exports = router;
```

- [ ] **Step 2: 문법 검증**

```bash
node --check routes/doom.js
```

기대 결과: 출력 없이 종료

---

## Task 4: `scheduler.js` 생성

**Files:**
- Create: `edi-backend/scheduler.js`

- [ ] **Step 1: `scheduler.js` 작성**

`edi-backend/scheduler.js` 파일 전체 내용:

```js
// scheduler.js
// 멸망 지수 계산 함수(runDoomCalculation)와 크론 등록 함수(registerCron)를 분리 제공합니다.
// runDoomCalculation은 testRunner.js에서도 import해 재사용합니다.
// registerCron은 index.js에서만 호출해 require만으로 크론이 등록되는 사이드이펙트를 방지합니다.
//
// services/ 경로 예시: require('./services/societyService')
const cron = require('node-cron');
const { calculateSocietyScore } = require('./services/societyService');
const { calculateClimateScore } = require('./services/climateService');
const { calculateEconomyScore } = require('./services/economyService');
const { calculateSolarScore } = require('./services/solarService');
const { generateCommentary } = require('./services/aiService');
const { saveDoomRecord } = require('./db');

// 4개 지표를 병렬 수집 → 점수 합산 → AI 코멘터리 → DB 저장
const runDoomCalculation = async () => {
  console.log(`[${new Date().toISOString()}] 🚨 Doom Calculation Started!`);

  const [societyData, climateData, economyData, solarData] = await Promise.all([
    calculateSocietyScore(),
    calculateClimateScore(),
    calculateEconomyScore(),
    calculateSolarScore(),
  ]);

  const totalScore =
    societyData.societyScore +
    climateData.climateScore +
    economyData.economyScore +
    solarData.solarScore;

  const commentary = await generateCommentary({
    totalScore,
    societySummary: societyData.summary,
    climateSummary: climateData.summary,
    economySummary: economyData.summary,
    solarSummary: solarData.summary,
  });

  const targetDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  await saveDoomRecord({
    targetDate,
    societyScore: societyData.societyScore,
    climateScore: climateData.climateScore,
    economyScore: economyData.economyScore,
    solarScore: solarData.solarScore,
    totalScore,
    commentary,
  });

  console.log(`[${new Date().toISOString()}] ✅ Doom Record Saved! Date: ${targetDate}, Score: ${totalScore}/100`);
};

// 매일 UTC 00:01에 runDoomCalculation 실행 — index.js에서만 호출
const registerCron = () => {
  cron.schedule('1 0 * * *', async () => {
    try {
      await runDoomCalculation();
    } catch (error) {
      console.error('Error during Doom Calculation:', error);
    }
  }, { timezone: 'UTC' });
};

module.exports = { runDoomCalculation, registerCron };
```

- [ ] **Step 2: 문법 검증**

```bash
node --check scheduler.js
```

기대 결과: 출력 없이 종료

---

## Task 5: `index.js` 슬림화

**Files:**
- Modify: `edi-backend/index.js` (전체 교체)

- [ ] **Step 1: `index.js` 전체 교체**

`edi-backend/index.js` 파일 전체 내용:

```js
// index.js
// 서버 진입점. Express 앱 조립, DB 초기화, 라우트·크론 등록 후 서버를 시작합니다.
// dotenv는 DB Pool과 외부 API 키를 사용하는 모든 모듈보다 반드시 먼저 로드합니다.
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const doomRouter = require('./routes/doom');
const { registerCron } = require('./scheduler');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', doomRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  await initDB();
  registerCron();
});
```

- [ ] **Step 2: 문법 검증**

```bash
node --check index.js
```

기대 결과: 출력 없이 종료

---

## Task 6: `testRunner.js` 업데이트

**Files:**
- Modify: `edi-backend/testRunner.js` (전체 교체)

> **참고:** 리팩토링 후 `testRunner.js`는 `runDoomCalculation`을 공유하므로 DB 연결이 필요합니다. 실행 전 `docker compose up -d`로 DB를 먼저 기동하세요. 기존의 단계별 점수 출력(`=> 점수: N/30`)은 이 변경으로 제거되고, `scheduler.js`의 운영 로그 형식으로 대체됩니다.

- [ ] **Step 1: `testRunner.js` 전체 교체**

`edi-backend/testRunner.js` 파일 전체 내용:

```js
// testRunner.js
// 각 지표 서비스와 AI 코멘터리를 포함한 전체 멸망 지수 계산을 수동으로 테스트합니다.
// scheduler.js의 runDoomCalculation을 재사용해 중복 로직을 제거합니다.
// 주의: DB 연결이 필요합니다. 실행 전 docker compose up -d로 DB를 먼저 기동하세요.
require('dotenv').config(); // DB Pool과 외부 API 키가 사용되기 전에 반드시 먼저 실행
const { runDoomCalculation } = require('./scheduler');

console.log('🌍 지구 멸망 지수(EDI) 데이터 수집 테스트 시작...\n');
runDoomCalculation().catch((error) => {
  console.error('테스트 중 에러 발생:', error);
});
```

- [ ] **Step 2: 문법 검증**

```bash
node --check testRunner.js
```

기대 결과: 출력 없이 종료

---

## Task 7: 구버전 서비스 파일 삭제 및 최종 검증

**Files:**
- Delete: `edi-backend/gdeltService.js`, `climateService.js`, `economyService.js`, `solarService.js`, `aiService.js`

- [ ] **Step 1: 구버전 루트 서비스 파일 삭제**

```bash
rm gdeltService.js climateService.js economyService.js solarService.js aiService.js
```

- [ ] **Step 2: Docker로 서버 재빌드 후 기동**

```bash
docker compose up -d --build
sleep 5
```

- [ ] **Step 3: 엔드포인트 검증**

```bash
curl -s http://localhost:3000/api/today-doom
curl -s "http://localhost:3000/api/doom-history?days=3"
```

기대 결과:
- `today-doom`: `{"message":"아직 계산된 멸망 지수가 없습니다."}` 또는 기존 기록 JSON
- `doom-history`: `[]` 또는 기존 기록 배열 JSON

- [ ] **Step 4: 로그에서 오류 없는지 확인**

```bash
docker compose logs edi-api | tail -20
```

기대 결과: `✅ DB Schema is ready.` 포함, `Error` 없음
