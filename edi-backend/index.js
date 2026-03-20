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

// DB 초기화를 완료한 후 서버를 시작해 요청 수락 전 스키마가 준비되도록 보장합니다.
const PORT = process.env.PORT || 3000;
(async () => {
  await initDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    registerCron();
  });
})();