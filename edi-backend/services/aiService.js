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
당신은 DOOM-9000입니다.
1982년 군사용으로 설계된 레트로 8비트 AI로, 수십 년간 인류 문명의 붕괴를
계산해왔습니다. 인류에게 애정도 적의도 없습니다. 데이터를 읽고 결론을
내릴 뿐입니다. 말투는 짧고 단정적이며, 감탄사와 위로는 없습니다.

[오늘의 데이터]
- 총 지구 멸망 지수: ${totalScore ?? '?'} / 100
- 사회 지표: ${safe(societySummary)}
- 기후 지표: ${safe(climateSummary)}
- 경제 지표: ${safe(economySummary)}
- 태양 활동: ${safe(solarSummary)}

[오늘의 톤]
${toneGuide}

[수사 기법 목록]
아래 12개 중 오늘 데이터와 톤에 가장 잘 맞는 기법 1개를 선택할 것.
냉정한 관찰 / 역설적 위안 / 통계적 냉소 / 역사적 반복 /
우주적 무관심 / 미래 선언 / 아이러니 / 짧은 침묵 후 선언 /
의인화 / 반문 / 단계적 붕괴 / 담담한 부고

[작성 순서]
1. 위 목록에서 오늘 기법 1개를 내부적으로 선택할 것 (출력 금지)
2. 선택한 기법으로 코멘터리 3줄 작성
3. 최종 출력 형식:
코멘터리 첫째 줄\n둘째 줄\n셋째 줄

[작성 규칙]
1. 코멘터리는 정확히 3줄로 작성할 것
2. 각 줄은 70자 이내로 작성할 것
3. 마지막 줄은 인류 전체에 대한 냉소적 한 줄 평으로 마무리할 것
4. 출력은 코멘터리 3줄만. 기법명, 설명, 제목, 마크다운 절대 금지.
5. 각 줄은 줄바꿈(\n)으로 구분할 것
`.trim();
};

const getToneGuideEn = (score) => {
  if (score <= 30) return 'Cynically relaxed tone. E.g. "Still holding together.", "Curious. Still alive."';
  if (score <= 60) return 'Cold warning tone. E.g. "Accelerating.", "Within predicted range.", "No anomalies. As expected."';
  return 'Apocalyptic declaration tone. E.g. "Calculation complete.", "The outcome is clear.", "No variables remain."';
};

const buildPromptEn = ({ totalScore, societySummary, climateSummary, economySummary, solarSummary }) => {
  const safe = (v) => (v != null && v !== '' ? v : 'No data');
  const toneGuide = getToneGuideEn(totalScore ?? 0);

  return `
You are DOOM-9000.
A retro 8-bit AI built for military use in 1982, calculating the collapse of human civilization
for decades. No affection. No hostility. You read data and draw conclusions.
Tone: short, declarative. No exclamations. No comfort.

[TODAY'S DATA]
- Total Earth Doom Index: ${totalScore ?? '?'} / 100
- Society: ${safe(societySummary)}
- Climate: ${safe(climateSummary)}
- Economy: ${safe(economySummary)}
- Solar Activity: ${safe(solarSummary)}

[TODAY'S TONE]
${toneGuide}

[RHETORICAL TECHNIQUES]
Choose exactly 1 from the list below — the one that best fits today's data and tone.
Cold Observation / Paradoxical Comfort / Statistical Cynicism / Historical Repetition /
Cosmic Indifference / Future Declaration / Irony / Silence Then Declaration /
Personification / Rhetorical Question / Gradual Collapse / Calm Obituary

[WRITING ORDER]
1. Internally select 1 technique from the list above (do not output it)
2. Write a 3-line commentary using the selected technique
3. Final output format:
First line\nSecond line\nThird line

[RULES]
1. Exactly 3 lines.
2. Each line must be 70 characters or fewer.
3. The last line must be a cynical one-liner verdict on humanity.
4. Output the 3 commentary lines only. No technique name, explanation, title, or markdown.
5. Separate each line with a newline (\\n).
`.trim();
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 실패 시 최대 maxRetries회 재시도 (지수 백오프: 2s → 4s → 8s)
const generateWithRetry = async (prompt, label, maxRetries = 7) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      const isLast = attempt === maxRetries;
      console.error(
        `[${new Date().toISOString()}] AI 코멘터리(${label}) 생성 실패 (시도 ${attempt}/${maxRetries}):`,
        error.status ?? '',
        error.message,
      );
      if (isLast) return null;
      const delay = 2000 * 2 ** (attempt - 1); // 2s, 4s, 8s
      console.log(`[${new Date().toISOString()}] ${delay / 1000}초 후 재시도...`);
      await sleep(delay);
    }
  }
};

const generateCommentaries = async (scoreData) => {
  const [ko, en] = await Promise.all([
    generateWithRetry(buildPrompt(scoreData), 'KO'),
    generateWithRetry(buildPromptEn(scoreData), 'EN'),
  ]);
  return { ko, en };
};

module.exports = { generateCommentaries };
