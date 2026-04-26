// economyService.js
// Yahoo Finance에서 5개 신호(VIX, S&P 일변동/drawdown, HYG drawdown, 수익률곡선)를
// 수집해 stress points로 환산하고, BREAKPOINTS 기반 선형보간으로 0~30점 경제 위협 지수를 산출합니다.
const axios = require('axios');

const YAHOO_FINANCE_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

const lerp = (x, x0, x1, y0, y1) => y0 + (y1 - y0) * (x - x0) / (x1 - x0);

// 입력값을 piecewise linear로 stress points로 변환.
// table: [[input0, stress0], [input1, stress1], ...] (input 오름차순)
// input <= table[0][0] → stress0, input >= table[last][0] → stress_last
const piecewise = (input, table) => {
  if (input <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (input <= table[i][0]) {
      return lerp(input, table[i - 1][0], table[i][0], table[i - 1][1], table[i][1]);
    }
  }
  return table[table.length - 1][1];
};

// 신호별 stress 변환표 — 스펙 §새 공식 §신호별 변환표 참조
const VIX_TABLE      = [[12, 0], [15, 1], [20, 3], [30, 6], [40, 9], [60, 12]];
const SP_DD_TABLE    = [[5,  0], [10, 2], [20, 5], [30, 8], [40, 11], [50, 12]];
const HYG_DD_TABLE   = [[3,  0], [7,  2], [12, 5], [18, 8], [22, 11], [25, 12]];
const CURVE_TABLE    = [[0,  0], [30, 1], [50, 3], [100, 5], [150, 7], [200, 8]];
const SP_DAILY_TABLE = [[1,  0], [2,  2], [3,  3], [5, 5], [7, 6]];

// totalStress(0~50) → score(0~30) 매핑 BREAKPOINTS
const SCORE_BREAKPOINTS = [
  [0, 0], [5, 3], [12, 8], [20, 14], [28, 20], [36, 26], [42, 30],
];

const scoreFromStress = (totalStress) => {
  if (totalStress >= 42) return 30;
  return Math.round(piecewise(totalStress, SCORE_BREAKPOINTS));
};

// 1년 종가 시계열 fetch. null 제거된 closes 배열 반환.
const fetchTimeSeries = async (ticker) => {
  const { data } = await axios.get(`${YAHOO_FINANCE_BASE}/${ticker}`, {
    params: { range: '1y', interval: '1d' },
  });
  const closes = data.chart.result?.[0]?.indicators?.quote?.[0]?.close;
  if (!closes) throw new Error(`종가 시계열 없음: ${ticker}`);
  const valid = closes.filter((v) => v != null);
  if (valid.length < 2) throw new Error(`유효 종가 부족: ${ticker} (${valid.length}건)`);
  return valid;
};

// 단일 현재가 fetch (VIX, ^TNX, ^IRX용).
const fetchCurrentValue = async (ticker) => {
  const { data } = await axios.get(`${YAHOO_FINANCE_BASE}/${ticker}`, {
    params: { range: '1d', interval: '1d' },
  });
  const value = data.chart.result?.[0]?.meta?.regularMarketPrice;
  if (value == null) throw new Error(`현재가 없음: ${ticker}`);
  return value;
};

// 시계열에서 (전일 대비 변동률, 1년 고점 대비 drawdown) 계산.
// drawdown은 음수 (0 또는 음수). dailyChange는 부호 그대로.
const computeChangeAndDrawdown = (closes) => {
  const current = closes[closes.length - 1];
  const previous = closes[closes.length - 2];
  const max = Math.max(...closes);
  const dailyChange = ((current - previous) / previous) * 100;
  const drawdown = ((current - max) / max) * 100;
  return { dailyChange, drawdown };
};

const calculateEconomyScore = async () => {
  const [spResult, hygResult, vixResult, tnxResult, irxResult] = await Promise.allSettled([
    fetchTimeSeries('^GSPC'),
    fetchTimeSeries('HYG'),
    fetchCurrentValue('^VIX'),
    fetchCurrentValue('^TNX'),
    fetchCurrentValue('^IRX'),
  ]);

  let totalStress = 0;
  const lines = [];

  // S&P 500: 일변동률 + 1년 drawdown
  if (spResult.status === 'fulfilled') {
    const { dailyChange, drawdown } = computeChangeAndDrawdown(spResult.value);
    const dailyStress = piecewise(Math.abs(dailyChange), SP_DAILY_TABLE);
    const ddStress    = piecewise(Math.abs(drawdown),    SP_DD_TABLE);
    totalStress += dailyStress + ddStress;
    lines.push(`  S&P 일변동: ${dailyChange.toFixed(2)}% (stress ${dailyStress.toFixed(1)})`);
    lines.push(`  S&P 1Y drawdown: ${drawdown.toFixed(1)}% (stress ${ddStress.toFixed(1)})`);
  } else {
    console.warn(`⚠️ ^GSPC 수집 실패: ${spResult.reason.message}`);
  }

  // HYG: 1년 drawdown만 (신용 스트레스)
  if (hygResult.status === 'fulfilled') {
    const { drawdown } = computeChangeAndDrawdown(hygResult.value);
    const ddStress = piecewise(Math.abs(drawdown), HYG_DD_TABLE);
    totalStress += ddStress;
    lines.push(`  HYG 1Y drawdown: ${drawdown.toFixed(1)}% (stress ${ddStress.toFixed(1)})`);
  } else {
    console.warn(`⚠️ HYG 수집 실패: ${hygResult.reason.message}`);
  }

  // VIX: 현재 레벨 (단기 패닉)
  if (vixResult.status === 'fulfilled') {
    const vix = vixResult.value;
    const vixStress = piecewise(vix, VIX_TABLE);
    totalStress += vixStress;
    lines.push(`  VIX: ${vix.toFixed(1)} (stress ${vixStress.toFixed(1)})`);
  } else {
    console.warn(`⚠️ ^VIX 수집 실패: ${vixResult.reason.message}`);
  }

  // 수익률곡선: ^TNX(10Y) − ^IRX(13W). 양수면 정상, 음수면 inversion.
  // Yahoo는 yield를 % 단위로 반환하므로 × 100 → bp.
  if (tnxResult.status === 'fulfilled' && irxResult.status === 'fulfilled') {
    const tnx = tnxResult.value;
    const irx = irxResult.value;
    const spreadBp = (tnx - irx) * 100;
    const inversionBp = spreadBp < 0 ? Math.abs(spreadBp) : 0;
    const curveStress = piecewise(inversionBp, CURVE_TABLE);
    totalStress += curveStress;
    lines.push(`  10Y-3M 곡선: ${spreadBp.toFixed(0)}bp (stress ${curveStress.toFixed(1)})`);
  } else {
    if (tnxResult.status === 'rejected') console.warn(`⚠️ ^TNX 수집 실패: ${tnxResult.reason.message}`);
    if (irxResult.status === 'rejected') console.warn(`⚠️ ^IRX 수집 실패: ${irxResult.reason.message}`);
  }

  const score = scoreFromStress(totalStress);

  lines.forEach((l) => console.log(l));
  console.log(`  totalStress: ${totalStress.toFixed(1)} → score ${score}`);

  const label = totalStress >= 36 ? '시스템 위기 (2008·COVID급)'
    : totalStress >= 28 ? '본격적 위기·신용 경색'
    : totalStress >= 20 ? '약세장·다중 스트레스'
    : totalStress >= 12 ? '시장 변동성 확대'
    : totalStress >=  5 ? '일상적 시장 변동'
    : null;

  return {
    economyScore: score,
    summary: label
      ? `${label} (스트레스 ${totalStress.toFixed(0)})`
      : '글로벌 자산시장 안정',
  };
};

module.exports = { calculateEconomyScore };
