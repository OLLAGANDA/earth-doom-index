// scheduler.js
// 멸망 지수 계산 함수(runDoomCalculation)와 크론 등록 함수(registerCron)를 분리 제공합니다.
// runDoomCalculation은 testRunner.js에서도 import해 재사용합니다.
// registerCron은 index.js에서만 호출해 require만으로 크론이 등록되는 사이드이펙트를 방지합니다.
const cron = require('node-cron');
const { calculateSocietyScore } = require('./services/societyService');
const { calculateClimateScore } = require('./services/climateService');
const { calculateEconomyScore } = require('./services/economyService');
const { calculateSolarScore } = require('./services/solarService');
const { generateCommentaries } = require('./services/aiService');
const { saveDoomRecord } = require('./db');

// 4개 지표를 병렬 수집 → 점수 합산 → AI 코멘터리 → DB 저장
// dryRun=true 시 계산만 수행하고 DB 저장을 건너뜁니다.
const runDoomCalculation = async ({ dryRun = false } = {}) => {
  console.log(`[${new Date().toISOString()}] 🚨 Doom Calculation Started!${dryRun ? ' (DRY RUN — DB 저장 안 함)' : ''}`);

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

  const { ko: commentary, en: commentaryEn } = await generateCommentaries({
    totalScore,
    societySummary: societyData.summary,
    climateSummary: climateData.summary,
    economySummary: economyData.summary,
    solarSummary: solarData.summary,
  });

  const targetDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  if (dryRun) {
    console.log(`[${new Date().toISOString()}] 🧪 DRY RUN 완료. Date: ${targetDate}, Score: ${totalScore}/100`);
    console.log(`\n💬 AI Commentary (KO):\n${commentary}`);
    console.log(`\n💬 AI Commentary (EN):\n${commentaryEn}`);
    return;
  }

  await saveDoomRecord({
    targetDate,
    societyScore: societyData.societyScore,
    climateScore: climateData.climateScore,
    economyScore: economyData.economyScore,
    solarScore: solarData.solarScore,
    totalScore,
    commentary,
    commentaryEn,
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
