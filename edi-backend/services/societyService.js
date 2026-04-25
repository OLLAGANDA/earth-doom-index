// societyService.js
// GDELT V2 이벤트 데이터를 스트리밍으로 파싱해 사회 불안 지수를 계산합니다.
const axios = require('axios');
const unzipper = require('unzipper');
const readline = require('readline');

const GDELT_LAST_UPDATE_URL = 'http://data.gdeltproject.org/gdeltv2/lastupdate.txt';

// CAMEO 루트코드별 위협 가중치 (비대칭 — WMD/대량폭력 폭증, 시위 압축)
// 30:0.2 비율로 임계 사건과 일상 노이즈를 분리
const THREAT_WEIGHTS = {
  '20': 30,  // 비전통적 대량폭력 (테러, 집단학살, 화학·생물·핵 무기)
  '19': 5,   // 전투·무력충돌
  '18': 4,   // 폭행·폭격·물리적 공격
  '17': 1,   // 강제·제재·봉쇄
  '15': 1,   // 군사력 과시 (병력 배치, 무력시위)
  '13': 1,   // 위협·협박 (핵 위협, 최후통첩)
  '14': 0.2, // 시위·집회
};

// EventRootCode는 TSV 28번째 컬럼(0-indexed) — 26은 EventCode(세부코드), 28이 루트코드
// NumMentions 는 31번째 컬럼 — 그 사건이 15분 윈도우 내 보도된 횟수
const EVENT_ROOT_CODE_INDEX = 28;
const NUM_MENTIONS_INDEX = 31;

const calculateSocietyScore = async () => {
  // lastupdate.txt 첫 번째 줄 세 번째 토큰이 최신 export 파일 URL
  const { data } = await axios.get(GDELT_LAST_UPDATE_URL, { responseType: 'text' });
  const latestExportUrl = data.split('\n')[0].trim().split(' ')[2];

  if (!latestExportUrl) {
    throw new Error('GDELT 업데이트 URL을 파싱할 수 없습니다.');
  }

  console.log(`📡 Fetching GDELT data from: ${latestExportUrl}`);
  return parseGDELTStream(latestExportUrl);
};

// ZIP 스트림을 라인 단위로 읽어 메모리를 최소화합니다.
// new Promise(async ...) 안티패턴을 피하기 위해 axios 호출을 .then()으로 체이닝합니다.
const parseGDELTStream = (url) => {
  return new Promise((resolve, reject) => {
    axios.get(url, { responseType: 'stream' })
      .then((response) => {
        const zipStream = response.data.pipe(unzipper.ParseOne());
        const rl = readline.createInterface({ input: zipStream, crlfDelay: Infinity });

        let weightedThreat = 0;
        let rawThreatCount = 0;
        let totalLines = 0;
        let mentionsSum = 0;
        let mentionsMax = 0;

        rl.on('line', (line) => {
          totalLines++;
          const cols = line.split('\t');
          const eventRootCode = cols[EVENT_ROOT_CODE_INDEX];
          const weight = THREAT_WEIGHTS[eventRootCode];
          if (weight) {
            const mentionsRaw = parseInt(cols[NUM_MENTIONS_INDEX], 10);
            const mentions = Number.isFinite(mentionsRaw) && mentionsRaw > 0 ? mentionsRaw : 0;
            weightedThreat += weight * Math.log10(mentions + 1);
            rawThreatCount++;
            mentionsSum += mentions;
            if (mentions > mentionsMax) mentionsMax = mentions;
          }
        });

        rl.on('close', () => {
          const mentionsAvg = rawThreatCount > 0 ? mentionsSum / rawThreatCount : 0;
          console.log(`📊 파싱 완료: 총 ${totalLines}건의 이벤트 분석됨`);
          console.log(`- 위협 이벤트: ${rawThreatCount}건 (가중합산: ${weightedThreat.toFixed(1)})`);
          console.log(`- NumMentions 평균: ${mentionsAvg.toFixed(1)}, 최대: ${mentionsMax}`);

          // 가중 위협 합산 → 점수 구간 선형 보간 (0~30점)
          // 비대칭 가중치 × log10(mentions+1) 결과를 시나리오 기반 7구간으로 매핑
          const BREAKPOINTS = [
            { count:    0, score:  0 },
            { count:   50, score:  3 },
            { count:  200, score: 10 },
            { count:  500, score: 16 },
            { count: 1000, score: 21 },
            { count: 2000, score: 26 },
            { count: 4000, score: 30 },
          ];
          const lerp = (x, x0, x1, y0, y1) => y0 + (y1 - y0) * (x - x0) / (x1 - x0);
          const calcScore = (n) => {
            if (n >= 4000) return 30;
            for (let i = 1; i < BREAKPOINTS.length; i++) {
              if (n <= BREAKPOINTS[i].count) {
                const { count: x0, score: y0 } = BREAKPOINTS[i - 1];
                const { count: x1, score: y1 } = BREAKPOINTS[i];
                return Math.round(lerp(n, x0, x1, y0, y1));
              }
            }
            return 30;
          };

          const score = calcScore(weightedThreat);
          const label = weightedThreat >= 2000 ? '세계적 임계 사건'
            : weightedThreat >= 1000 ? '다지역 전면전·고강도 위협'
            : weightedThreat >=  500 ? '활성 무력충돌·중대 분쟁'
            : weightedThreat >=  200 ? '국지 분쟁·국제 갈등 고조'
            : weightedThreat >=   50 ? '일상적 국지 시위·외교 마찰'
            : null;

          resolve({
            societyScore: score,
            summary: label ? `${label} (위협지수 ${weightedThreat.toFixed(0)})` : '특이한 글로벌 사회적 혼란 없음',
          });
        });

        rl.on('error', reject);
        zipStream.on('error', reject);
      })
      .catch(reject);
  });
};

module.exports = { calculateSocietyScore };
