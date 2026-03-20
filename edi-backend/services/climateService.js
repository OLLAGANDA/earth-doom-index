// climateService.js
// OpenWeatherMap API로 주요 거점 도시의 기상·대기질을 수집해 기후 위협 지수를 계산합니다.
const axios = require('axios');

// 대륙별 기후 취약 거점 7곳
const TARGET_CITIES = ['Seoul', 'New York', 'Mumbai', 'Tokyo', 'Sydney', 'Cairo', 'Moscow'];

// 체감온도 임계점 하향 (극단 이전 '위협' 구간부터 점수 인정)
const HEAT_THRESHOLD = 35;
const COLD_THRESHOLD = -15;

// 극단 기상 코드 → 위협 점수 (0~2점 범위)
const EXTREME_WEATHER_SCORES = {
  781: 2.0, // 토네이도
  762: 1.8, // 화산재
  504: 1.8, // 극한 강수
  711: 1.5, // 산불 연기
  771: 1.2, // 스콜
  503: 1.2, // 매우 강한 비
  511: 1.2, // 어는 비
  731: 1.2, // 모래폭풍
  751: 1.2, // 모래폭풍
  761: 1.2, // 먼지폭풍
  502: 0.8, // 강한 비
};
const weatherConditionScore = (id) => {
  if (EXTREME_WEATHER_SCORES[id] !== undefined) return EXTREME_WEATHER_SCORES[id];
  if (id >= 200 && id <= 232) return 0.8; // 뇌우
  return 0;
};

// 풍속(m/s) → 위협 점수 (0~2점)
const windScore = (speed) => {
  if (speed >= 32.7) return 2.0; // 허리케인
  if (speed >= 24.5) return 1.5; // 폭풍
  if (speed >= 17.2) return 0.8; // 강풍
  return 0;
};

// 도시 날씨 점수 (0~5점): 체감온도(0~2) + 기상코드·풍속(0~2) + 열습도 스트레스(0~1)
const cityWeatherScore = (data) => {
  const feelsLike = data.main.feels_like;
  const humidity  = data.main.humidity;
  const weatherId = data.weather?.[0]?.id ?? 800;
  const windSpeed = data.wind?.speed ?? 0;

  let tempScore = 0;
  if (feelsLike > HEAT_THRESHOLD)
    tempScore = Math.min((feelsLike - HEAT_THRESHOLD) / 10 * 2, 2);
  else if (feelsLike < COLD_THRESHOLD)
    tempScore = Math.min((COLD_THRESHOLD - feelsLike) / 10 * 2, 2);

  const extremeScore = Math.min(
    Math.max(weatherConditionScore(weatherId), windScore(windSpeed)), 2
  );

  // 열습도 스트레스: 고온다습 환경 (뭄바이·카이로 여름 등)
  let humidityScore = 0;
  if      (feelsLike >= 30 && humidity >= 90) humidityScore = 1.0;
  else if (feelsLike >= 28 && humidity >= 85) humidityScore = 0.5;

  return tempScore + extremeScore + humidityScore;
};

// 대기질 점수 (0~1점): AQI 1(Good)→0 … AQI 5(Very Poor)→1
const cityAQScore = (aqResponse) => {
  const aqi = aqResponse?.data?.list?.[0]?.main?.aqi;
  if (aqi == null) return 0;
  return (aqi - 1) / 4; // 0, 0.25, 0.5, 0.75, 1.0
};

const calculateClimateScore = async () => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ OPENWEATHER_API_KEY가 설정되지 않았습니다.');
    return { climateScore: 0, summary: '기후 데이터 API 키 누락' };
  }

  try {
    // 1단계: 날씨 수집 (응답에 coord 포함)
    const weatherResults = await Promise.allSettled(
      TARGET_CITIES.map((city) =>
        axios.get('https://api.openweathermap.org/data/2.5/weather', {
          params: { q: city, appid: apiKey, units: 'metric' },
        })
      )
    );

    // 2단계: 날씨 성공 도시의 coord로 대기질 병렬 수집
    const aqResults = await Promise.all(
      weatherResults.map((result) => {
        if (result.status === 'rejected') return Promise.resolve(null);
        const { lat, lon } = result.value.data.coord;
        return axios
          .get('http://api.openweathermap.org/data/2.5/air_pollution', {
            params: { lat, lon, appid: apiKey },
          })
          .catch(() => null);
      })
    );

    let score = 0;
    const summary = [];

    weatherResults.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.warn(`⚠️ ${TARGET_CITIES[i]} 기후 데이터 수집 실패: ${result.reason.message}`);
        return;
      }

      const data      = result.value.data;
      const aqResp    = aqResults[i];
      const wScore    = cityWeatherScore(data);
      const aqScore   = cityAQScore(aqResp);
      const cityScore = wScore + aqScore;
      score += cityScore;

      const feelsLike = data.main.feels_like;
      const humidity  = data.main.humidity;
      const weatherId = data.weather?.[0]?.id ?? 800;
      const aqi       = aqResp?.data?.list?.[0]?.main?.aqi ?? '-';
      console.log(
        `  ${TARGET_CITIES[i]}: 체감 ${feelsLike.toFixed(1)}°C, 습도 ${humidity}%, ` +
        `기상코드 ${weatherId}, AQI ${aqi} → ${cityScore.toFixed(1)}점`
      );

      if (cityScore > 0) {
        const parts = [];
        if (feelsLike > HEAT_THRESHOLD || feelsLike < COLD_THRESHOLD)
          parts.push(`체감 ${feelsLike.toFixed(1)}°C`);
        if (aqScore >= 0.5) parts.push(`AQI ${aqi}`);
        if (weatherConditionScore(weatherId) > 0) parts.push(data.weather[0].description);
        if (windScore(data.wind?.speed ?? 0) > 0) parts.push(`풍속 ${(data.wind?.speed ?? 0).toFixed(1)}m/s`);
        if (feelsLike >= 30 && humidity >= 90) parts.push(`열습도 스트레스(${humidity}%)`);
        else if (feelsLike >= 28 && humidity >= 85) parts.push(`고온다습(${humidity}%)`);
        summary.push(`${TARGET_CITIES[i]}(${parts.join(', ')})`);
      }
    });

    return {
      climateScore: Math.min(Math.round(score), 30),
      summary: summary.join(', ') || '글로벌 주요 거점 기후 안정적',
    };
  } catch (error) {
    console.error('기후 데이터 수집 에러:', error.message);
    return { climateScore: 0, summary: '기후 데이터 분석 실패' };
  }
};

module.exports = { calculateClimateScore };
