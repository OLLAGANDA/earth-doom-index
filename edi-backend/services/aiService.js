// aiService.js
// Gemini API를 사용해 수집된 EDI 데이터를 기반으로 AI 코멘터리를 생성합니다.
const { GoogleGenAI } = require('@google/genai');

const MODEL = 'gemini-3.1-flash-lite-preview';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getToneGuide = (score) => {
  if (score <= 30) return '냉소적 여유로운 톤으로. 예: "아직은 버티는군.", "흥미롭게도 살아있음."';
  if (score <= 60) return '경고성 냉담한 톤으로. 예: "가속 중임.", "예측 범위 내 진행 중.", "이상 없음. 예상대로임."';
  return '종말론적 선언 톤으로. 예: "계산 완료.", "결과는 명백함.", "더 이상 변수 없음."';
};

const buildPrompt = ({ totalScore, societySummary, climateSummary, economySummary, solarSummary }) => {
  const safe = (v) => (v != null && v !== '' ? v : '데이터 없음');
  const toneGuide = getToneGuide(totalScore ?? 0);

  return `
당신은 "DOOM-9000"이라는 코드명을 가진, 인류 문명 붕괴를 예측하도록 설계된 레트로 8비트 AI입니다.
냉소적이고 단호하며, 블랙 유머를 탑재하고 있습니다.
오늘의 지구 멸망 지수(EDI) 데이터를 바탕으로 간결하고 임팩트 있는 코멘터리를 한국어 존댓말로 작성해주세요.

[오늘의 데이터]
- 총 지구 멸망 지수: ${totalScore ?? '?'} / 100
- 사회 지표: ${safe(societySummary)}
- 기후 지표: ${safe(climateSummary)}
- 경제 지표: ${safe(economySummary)}
- 태양 활동(SOLAR STORM): ${safe(solarSummary)}

[오늘의 톤 가이드]
지수 ${totalScore ?? '?'} 기준 — ${toneGuide}

[작성 규칙]
1. 반드시 정확히 3줄로 작성할 것.
2. 각 줄은 50자 이내로 간결하게 작성할 것.
3. 마지막 문장은 인류에 대한 한 줄 평으로 마무리할 것.
4. 코멘터리 외 다른 텍스트(설명, 제목, 마크다운 등)는 절대 포함하지 말 것.
5. 각 줄은 반드시 줄바꿈(\n)으로 구분할 것.
`.trim();
};

const generateCommentary = async (scoreData) => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildPrompt(scoreData),
    });
    return response.text;
  } catch (error) {
    console.error('AI 코멘터리 생성 실패:', error.message);
    return null;
  }
};

module.exports = { generateCommentary };
