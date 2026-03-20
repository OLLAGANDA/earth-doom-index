// economyService.js
// Yahoo Finance 비공개 API로 주요 자산의 전일 대비 변동률을 계산해 경제 위협 지수를 산출합니다.
const axios = require('axios');

// 변동률 기반 자산: threshold 초과 시 선형 증가, 최대 maxScore점
// VIX는 레벨 기반이라 별도 처리
const CHANGE_ASSETS = [
  { name: 'S&P 500',  ticker: '^GSPC', threshold: 2, maxScore: 10 },
  { name: '금 선물',  ticker: 'GC=F',  threshold: 2, maxScore:  5 },
  { name: 'WTI 원유', ticker: 'CL=F',  threshold: 3, maxScore:  5 },
];
const VIX_TICKER = '^VIX';

const YAHOO_FINANCE_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

const lerp = (x, x0, x1, y0, y1) => y0 + (y1 - y0) * (x - x0) / (x1 - x0);

// 변동률 → 점수 (0~maxScore)
const changeToScore = (changeRate, threshold, maxScore) => {
  const abs = Math.abs(changeRate);
  if (abs <= threshold)         return 0;
  if (abs <= threshold * 2)     return lerp(abs, threshold,     threshold * 2, 0,            maxScore * 0.5);
  if (abs <= threshold * 4)     return lerp(abs, threshold * 2, threshold * 4, maxScore * 0.5, maxScore * 0.8);
  return Math.min(lerp(abs, threshold * 4, threshold * 6, maxScore * 0.8, maxScore), maxScore);
};

// VIX 레벨 → 점수 (0~10): 공포지수는 수준 자체가 위협 척도
const vixToScore = (vix) => {
  if (vix < 15) return 0;
  if (vix < 20) return lerp(vix, 15, 20,  0, 2);
  if (vix < 30) return lerp(vix, 20, 30,  2, 6);
  if (vix < 40) return lerp(vix, 30, 40,  6, 9);
  return Math.min(lerp(vix, 40, 60, 9, 10), 10);
};

const fetchAssetChange = async (asset) => {
  const { data } = await axios.get(`${YAHOO_FINANCE_BASE}/${asset.ticker}`, {
    params: { range: '2d', interval: '1d' },
  });

  const result = data.chart.result?.[0];
  if (!result) return null;

  const meta = result.meta;
  const closes = result.indicators?.quote?.[0]?.close;

  // null을 제거한 유효 종가 목록으로 전일/당일 종가를 추출합니다.
  const validCloses = (closes || []).filter((v) => v != null);

  let prevClose, currentClose;

  if (validCloses.length >= 2) {
    prevClose = validCloses[validCloses.length - 2];
    currentClose = validCloses[validCloses.length - 1];
  } else {
    // 유효 종가가 1개 이하일 경우 meta 필드로 대체합니다.
    prevClose = meta?.chartPreviousClose;
    currentClose = meta?.regularMarketPrice ?? validCloses[0];
  }

  if (!prevClose || !currentClose) return null;

  return ((currentClose - prevClose) / prevClose) * 100;
};

const calculateEconomyScore = async () => {
  const [changeResults, vixResult] = await Promise.all([
    Promise.allSettled(CHANGE_ASSETS.map(fetchAssetChange)),
    axios.get(`${YAHOO_FINANCE_BASE}/${VIX_TICKER}`, { params: { range: '1d', interval: '1d' } })
      .catch((e) => ({ error: e.message })),
  ]);

  let score = 0;
  const summary = [];

  // 변동률 기반 자산 채점
  changeResults.forEach((result, i) => {
    const asset = CHANGE_ASSETS[i];

    if (result.status === 'rejected') {
      console.warn(`⚠️ ${asset.name} 데이터 수집 실패: ${result.reason.message}`);
      return;
    }

    const changeRate = result.value;
    if (changeRate === null) return;

    const assetScore = changeToScore(changeRate, asset.threshold, asset.maxScore);
    score += assetScore;
    console.log(`  ${asset.name}: ${changeRate.toFixed(2)}% (${assetScore.toFixed(1)}점)`);
    if (assetScore > 0) {
      summary.push(`${asset.name} ${changeRate.toFixed(2)}%`);
    }
  });

  // VIX 레벨 기반 채점
  if (vixResult.error) {
    console.warn(`⚠️ VIX 데이터 수집 실패: ${vixResult.error}`);
  } else {
    const vix = vixResult.data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (vix != null) {
      const vixScore = vixToScore(vix);
      score += vixScore;
      console.log(`  VIX: ${vix.toFixed(2)} (${vixScore.toFixed(1)}점)`);
      if (vixScore > 0) {
        summary.push(`VIX ${vix.toFixed(1)}`);
      }
    }
  }

  return {
    economyScore: Math.min(Math.round(score), 30),
    summary: summary.join(', ') || '글로벌 자산 시장 변동성 보통',
  };
};

module.exports = { calculateEconomyScore };
