// societyService.js
// GDELT V2 이벤트 데이터를 스트리밍으로 파싱해 사회 불안 지수를 계산합니다.
const axios = require('axios');
const unzipper = require('unzipper');
const readline = require('readline');

const GDELT_LAST_UPDATE_URL = 'http://data.gdeltproject.org/gdeltv2/lastupdate.txt';

// CAMEO 루트코드별 위협 가중치
// 심각도에 따라 차등 적용: 대량폭력(3) > 전투·공격(2) > 군사위협·강제(1.5) > 시위(1)
const THREAT_WEIGHTS = {
  '20': 3,   // 비전통적 대량폭력 (테러, 집단학살, 화학무기)
  '18': 2,   // 폭행·폭격·물리적 공격
  '19': 2,   // 전투·무력충돌
  '13': 1.5, // 위협·협박 (핵 위협, 최후통첩)
  '15': 1.5, // 군사력 과시 (병력 배치, 무력시위)
  '17': 1.5, // 강제·제재·봉쇄
  '14': 1,   // 시위·집회
};

// EventRootCode는 TSV 28번째 컬럼(0-indexed) — 26은 EventCode(세부코드), 28이 루트코드
const EVENT_ROOT_CODE_INDEX = 28;

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

        rl.on('line', (line) => {
          totalLines++;
          const eventRootCode = line.split('\t')[EVENT_ROOT_CODE_INDEX];
          const weight = THREAT_WEIGHTS[eventRootCode];
          if (weight) {
            weightedThreat += weight;
            rawThreatCount++;
          }
        });

        rl.on('close', () => {
          console.log(`📊 파싱 완료: 총 ${totalLines}건의 이벤트 분석됨`);
          console.log(`- 위협 이벤트: ${rawThreatCount}건 (가중합산: ${weightedThreat.toFixed(1)})`);

          // 가중 위협 합산 → 점수 구간 선형 보간 (0~30점)
          // 단순 카운트 대비 평균 가중치(~1.6x)를 반영해 구간 조정
          const BREAKPOINTS = [
            { count:   0, score:  0 },
            { count:  50, score:  5 },
            { count: 100, score: 12 },
            { count: 160, score: 20 },
            { count: 240, score: 26 },
            { count: 320, score: 30 },
          ];
          const lerp = (x, x0, x1, y0, y1) => y0 + (y1 - y0) * (x - x0) / (x1 - x0);
          const calcScore = (n) => {
            if (n >= 320) return 30;
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
          const label = weightedThreat >= 240 ? '심각한 전쟁·대량폭력'
            : weightedThreat >= 160 ? '대규모 무력충돌·테러'
            : weightedThreat >= 100 ? '상당한 분쟁·군사위협'
            : weightedThreat >=  50 ? '국지적 분쟁·시위'
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
