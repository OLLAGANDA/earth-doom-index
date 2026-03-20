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
