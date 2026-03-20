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
