// solarService.js
// NOAA SWPC 실시간 Kp 지수 + 당일 X선 플레어 데이터를 결합해 태양 활동 위협 지수를 계산합니다.
// Kp(지자기 폭풍): 0~7점, X선 플레어(전파·위성 장애): 0~3점 → 합산 최대 10점
const axios = require('axios');

const NOAA_KP_URL   = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';
const NOAA_XRAY_URL = 'https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json';

// Kp → 점수 (0~7점): G5 폭풍 단독 최대 7점, 플레어와 합산해 10점 도달
const KP_CURVE = [
  [0, 0], [4, 0.8], [5, 2], [6, 3.5], [7, 5], [8, 6.5], [9, 7],
];
const lerp = (x, x0, x1, y0, y1) => y0 + (y1 - y0) * (x - x0) / (x1 - x0);

const kpToScore = (kp) => {
  if (kp < 4) return 0;
  if (kp >= 9) return 7;
  for (let i = 1; i < KP_CURVE.length; i++) {
    if (kp <= KP_CURVE[i][0]) {
      const [x0, y0] = KP_CURVE[i - 1];
      const [x1, y1] = KP_CURVE[i];
      return parseFloat(lerp(kp, x0, x1, y0, y1).toFixed(1));
    }
  }
  return 7;
};

const kpToLabel = (kp) => {
  if (kp >= 8) return 'G4-G5 극심한 지자기 폭풍';
  if (kp >= 7) return 'G3 강한 지자기 폭풍';
  if (kp >= 6) return 'G2 보통 지자기 폭풍';
  if (kp >= 5) return 'G1 약한 지자기 폭풍';
  if (kp >= 4) return '태양 활동 증가';
  return '태양 활동 정상';
};

// X선 플럭스(W/m²) → 점수 (0~3점)
// 플레어 등급: M1=1e-5, M5=5e-5, X1=1e-4, X10=1e-3
const xrayToScore = (flux) => {
  if (flux < 1e-5) return 0;
  if (flux < 5e-5) return parseFloat(lerp(flux, 1e-5, 5e-5, 0,   1.5).toFixed(1)); // M1–M5
  if (flux < 1e-4) return parseFloat(lerp(flux, 5e-5, 1e-4, 1.5, 2.5).toFixed(1)); // M5–X1
  return parseFloat(Math.min(lerp(flux, 1e-4, 1e-3, 2.5, 3), 3).toFixed(1));       // X1+
};

const xrayToLabel = (flux) => {
  if (flux >= 1e-4) return 'X급 태양 플레어';
  if (flux >= 5e-5) return '강한 M급 태양 플레어';
  if (flux >= 1e-5) return 'M급 태양 플레어';
  return null;
};

// 당일 0.1-0.8nm(장파) 밴드 최대 플럭스 반환 — 표준 플레어 분류 기준
const fetchMaxXrayFlux = async () => {
  const { data } = await axios.get(NOAA_XRAY_URL);
  const longBand = data.filter((d) => d.energy === '0.1-0.8nm');
  if (!longBand.length) return 0;
  return Math.max(...longBand.map((d) => d.flux ?? 0));
};

const calculateSolarScore = async () => {
  try {
    const [kpData, maxFlux] = await Promise.all([
      axios.get(NOAA_KP_URL),
      fetchMaxXrayFlux().catch(() => 0),
    ]);

    const latest = kpData.data[kpData.data.length - 1];
    const kp       = parseFloat(latest.kp_index);
    const kpScore  = kpToScore(kp);
    const kpLabel  = kpToLabel(kp);

    const flareScore = xrayToScore(maxFlux);
    const flareLabel = xrayToLabel(maxFlux);

    const totalScore = parseFloat(Math.min(kpScore + flareScore, 10).toFixed(1));

    console.log(`☀️  Kp 지수: ${kp.toFixed(1)} — ${kpLabel} (${kpScore}점)`);
    if (flareLabel) {
      console.log(`🔥 태양 플레어: ${flareLabel} (최대 플럭스 ${maxFlux.toExponential(2)}, ${flareScore}점)`);
    } else {
      console.log(`🔆 태양 플레어: 없음 (최대 플럭스 ${maxFlux.toExponential(2)})`);
    }

    const summaryParts = [`Kp ${kp.toFixed(1)} / ${kpLabel}`];
    if (flareLabel) summaryParts.push(flareLabel);

    return {
      solarScore: totalScore,
      summary: summaryParts.join(', '),
    };
  } catch (error) {
    console.error('태양 활동 데이터 수집 에러:', error.message);
    return { solarScore: 0, summary: '태양 활동 데이터 분석 실패' };
  }
};

module.exports = { calculateSolarScore };
