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

// doom_records 테이블 생성 (서버 시작 시 1회 실행, 이미 존재하면 무시)
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS doom_records (
        id SERIAL PRIMARY KEY,
        target_date DATE UNIQUE NOT NULL,
        society_score INTEGER NOT NULL,
        climate_score INTEGER NOT NULL,
        economy_score INTEGER NOT NULL,
        solar_score INTEGER NOT NULL DEFAULT 0,
        total_score INTEGER NOT NULL,
        ai_commentary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      ALTER TABLE doom_records
      ADD COLUMN IF NOT EXISTS ai_commentary_en TEXT
    `);
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
    console.log('✅ DB Schema is ready.');
  } catch (err) {
    console.error('❌ DB Initialization Error:', err);
    throw err;
  }
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
  commentaryEn,
}) => {
  await pool.query(
    `INSERT INTO doom_records
       (target_date, society_score, climate_score, economy_score, solar_score, total_score, ai_commentary, ai_commentary_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (target_date) DO UPDATE SET
       society_score    = EXCLUDED.society_score,
       climate_score    = EXCLUDED.climate_score,
       economy_score    = EXCLUDED.economy_score,
       solar_score      = EXCLUDED.solar_score,
       total_score      = EXCLUDED.total_score,
       ai_commentary    = EXCLUDED.ai_commentary,
       ai_commentary_en = EXCLUDED.ai_commentary_en`,
    [targetDate, societyScore, climateScore, economyScore, solarScore, totalScore, commentary, commentaryEn]
  );
};

// direction: 'up' | 'flat' | 'down'
const saveVote = async (targetDate, direction) => {
  await pool.query(
    'INSERT INTO votes (target_date, direction) VALUES ($1, $2)',
    [targetDate, direction]
  );
};

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

module.exports = {
  pool, initDB, getDoomToday, getDoomHistory, saveDoomRecord,
  saveVote, deleteVote, getVotesToday, getYesterdayVoteResult,
};
