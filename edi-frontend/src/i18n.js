export const translations = {
  ko: {
    loading: '지구 멸망 지수 계산 중',
    loadingTitle: '🌍 LOADING...',
    systemError: '⚠ SYSTEM ERROR',
    noData: 'NO DATA',
    noCommentary: '해설 데이터 없음',
    terms: '이용약관',
    termsClose: '닫기',
    cardInfoSource: (source, max) => `출처: ${source} | 최대: ${max}점`,
    dateLocale: 'ko-KR',
    cards: {
      society: {
        desc: '사회 불안 지수. GDELT 뉴스 데이터를 기반으로 전 세계 사회적 갈등, 시위, 분쟁 이벤트의 빈도와 강도를 측정합니다.',
        source: 'GDELT Project',
      },
      climate: {
        desc: '기후 위협 지수. OpenWeather API를 기반으로 극단적 기상 현상, 이상 기온, 폭풍 등의 위협 수준을 측정합니다.',
        source: 'OpenWeather API',
      },
      economy: {
        desc: '경제 위협 지수. 글로벌 금융 시장 지표를 기반으로 경기 침체, 시장 불안정성, 인플레이션 위험을 측정합니다.',
        source: 'Yahoo Finance API',
      },
      solar: {
        desc: '태양 폭풍 지수. 태양 흑점 활동 및 지자기 폭풍 데이터를 기반으로 우주 기상이 지구에 미치는 위협을 측정합니다.',
        source: 'NOAA SWPC',
      },
    },
    termsContent: [
      '1. 본 서비스는 순수한 재미를 위한 토이 프로젝트입니다.',
      '2. 표시되는 지수는 실제 지구 위험도와 무관하며, 어떠한 과학적·법적 근거도 없습니다.',
      '3. 본 서비스의 정보를 실제 의사결정에 활용하지 마세요.',
      '4. 서비스는 예고 없이 변경되거나 종료될 수 있습니다.',
      '5. 진지하게 받아들이지 마세요. 지구는 (아마도) 괜찮습니다.',
    ],
  },
  en: {
    loading: 'Calculating Earth Doom Index...',
    loadingTitle: '🌍 LOADING...',
    systemError: '⚠ SYSTEM ERROR',
    noData: 'NO DATA',
    noCommentary: 'No commentary available.',
    terms: 'Terms of Service',
    termsClose: 'Close',
    cardInfoSource: (source, max) => `Source: ${source} | Max: ${max}pts`,
    dateLocale: 'en-US',
    cards: {
      society: {
        desc: 'Social unrest index. Measures frequency and intensity of global conflicts, protests, and dispute events based on GDELT news data.',
        source: 'GDELT Project',
      },
      climate: {
        desc: 'Climate threat index. Measures threat level of extreme weather events, temperature anomalies, and storms via OpenWeather API.',
        source: 'OpenWeather API',
      },
      economy: {
        desc: 'Economic threat index. Measures recession risk, market instability, and inflation danger based on global financial market indicators.',
        source: 'Yahoo Finance API',
      },
      solar: {
        desc: 'Solar storm index. Measures space weather threats to Earth based on sunspot activity and geomagnetic storm data.',
        source: 'NOAA SWPC',
      },
    },
    termsContent: [
      '1. This is a toy project made purely for fun.',
      '2. The displayed index has no relation to actual Earth danger and has no scientific or legal basis.',
      '3. Do not use this information for real decision-making.',
      '4. The service may change or shut down without notice.',
      "5. Don't take it seriously. Earth is (probably) fine.",
    ],
  },
}
