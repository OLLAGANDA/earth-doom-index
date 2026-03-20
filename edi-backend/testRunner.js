// testRunner.js
// 각 지표 서비스와 AI 코멘터리를 포함한 전체 멸망 지수 계산을 수동으로 테스트합니다.
// scheduler.js의 runDoomCalculation을 재사용해 중복 로직을 제거합니다.
// 주의: DB 연결이 필요합니다. 실행 전 docker compose up -d로 DB를 먼저 기동하세요.
require('dotenv').config(); // DB Pool과 외부 API 키가 사용되기 전에 반드시 먼저 실행
const { runDoomCalculation } = require('./scheduler');
const { pool } = require('./db');

console.log('🌍 지구 멸망 지수(EDI) 데이터 수집 테스트 시작...\n');
runDoomCalculation()
  .catch((error) => {
    console.error('테스트 중 에러 발생:', error);
  })
  .finally(() => pool.end()); // pg Pool 연결 종료 — 프로세스가 정상 종료되도록 보장
