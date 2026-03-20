// scheduler.js
// 멸망 지수 계산 함수(runDoomCalculation)와 크론 등록 함수(registerCron)를 분리 제공합니다.
// runDoomCalculation은 testRunner.js에서도 import해 재사용합니다.
// registerCron은 index.js에서만 호출해 require만으로 크론이 등록되는 사이드이펙트를 방지합니다.
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
