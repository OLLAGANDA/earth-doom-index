// routes/doom.js
// /api/today-doom, /api/doom-history 엔드포인트 핸들러를 정의합니다.
// HTTP 레이어만 담당하며, DB 쿼리는 db 모듈의 함수를 통해 실행합니다.
const { Router } = require('express');
const { getDoomToday, getDoomHistory, saveVote, deleteVote, getVotesToday, getYesterdayVoteResult } = require('../db');

const VALID_DIRECTIONS = new Set(['up', 'flat', 'down']);

function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

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

// 오늘 투표 집계 + 어제 예측 결과 반환
router.get('/vote/today', async (_req, res) => {
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

module.exports = router;
