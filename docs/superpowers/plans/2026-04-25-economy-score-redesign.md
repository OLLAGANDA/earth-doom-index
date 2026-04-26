# 경제 위협 지수 재설계 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yahoo Finance 기반 5개 신호(VIX, S&P 일변동/drawdown, HYG drawdown, 수익률곡선)를 stress points로 환산·합산하여 시나리오 기반 BREAKPOINTS로 0~30점에 매핑한다. 기존 자산별 합산 방식을 폐기하고 society 재설계 패턴을 따른다.

**Architecture:** `edi-backend/services/economyService.js` 단일 파일 전면 재작성. 외부 인터페이스(`calculateEconomyScore()` → `{ economyScore, summary }`) 보존. 기존 금/원유 호출 제거, HYG·^TNX·^IRX 호출 신규 추가. DB 스키마·API·호출부(`scheduler.js`, `testRunner.js`) 변경 없음.

**Tech Stack:** Node.js, axios(HTTP), Yahoo Finance v8 chart API. 별도 테스트 프레임워크 없음 — 노드 REPL과 testRunner.js dry-run으로 검증.

**Spec:** [`docs/superpowers/specs/2026-04-25-economy-score-redesign-design.md`](../specs/2026-04-25-economy-score-redesign-design.md)

---

## 사전 준비

이 계획은 다음을 가정한다:
- 작업 디렉터리: `/Users/dev/SideProjects/DoomIndex`
- `edi-backend/.env` 파일 존재 (경제 점수 자체는 외부 API 키 불필요, DB 변수만 testRunner에서 사용)
- 인터넷 접속 가능 (Yahoo Finance v8 chart API 호출)

각 태스크의 단발 검증은 다음 명령으로 수행한다 (DB 불필요):

```bash
cd edi-backend && node -e "require('./services/economyService').calculateEconomyScore().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => console.error(e))"
```

이하 본 계획에서 **REPL 검증 명령** 이라고 하면 위 명령을 의미한다.

---

## Task 1: economyService.js 전면 재작성

기존 가산식(자산별 max score 후 합산 clamp)을 폐기하고 5개 신호 stress 합산 + BREAKPOINTS 매핑 구조로 교체한다. 구조적 변경이라 단계 분할이 무의미하므로 **단일 atomic 교체**로 진행한다.

**Files:**
- Modify: `edi-backend/services/economyService.js` (전체 교체)

- [ ] **Step 1: 파일 전체 내용을 다음으로 교체**

```javascript
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
```

- [ ] **Step 2: REPL 검증 명령 실행**

```bash
cd edi-backend && node -e "require('./services/economyService').calculateEconomyScore().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => console.error(e))"
```

Expected (정상 동작):
- 콘솔에 5개 신호 라인 출력 (S&P 일변동, S&P 1Y drawdown, HYG 1Y drawdown, VIX, 10Y-3M 곡선) — 각 라인에 원시값과 stress 표시
- `totalStress: NN.N → score NN` 한 줄 추가 출력
- 마지막에 `{ "economyScore": NN, "summary": "..." }` JSON 출력
- **현재(2026-04~05) 시장 기준 economyScore가 5~12 범위**에 안착해야 정상. 0이나 30에 붙으면 BREAKPOINTS 또는 변환 곡선 재조정 필요 (Task 2 후속 검토).

**Sanity check — 수익률곡선 단위**: Yahoo `^TNX`/`^IRX` 는 yield를 %로 반환한다고 가정 (예: 4.25 = 4.25%). 만약 yield × 10 형태로 반환되면 (예: 42.5), spreadBp가 10배 어긋난다. 출력된 `10Y-3M 곡선: NNNbp` 값이 **정상 범위 (-300 ~ +400bp)** 안에 들어오는지 확인. 4000bp 같은 비정상 값이 나오면 yield를 10으로 나눠야 한다 — 별도 보정 PR로 처리.

만약 5개 중 일부 신호가 fetch 실패하더라도 나머지로 점수 산출이 진행되어야 한다 (`Promise.allSettled` 보장). 5개 모두 실패하면 score 0, summary "글로벌 자산시장 안정" 반환.

- [ ] **Step 3: 결과 메모**

다음 값을 메모 (PR 본문 또는 운영 관찰용):
- 신호별 (원시값, stress) 5쌍
- totalStress
- economyScore
- summary 라벨

- [ ] **Step 4: Commit**

```bash
git add edi-backend/services/economyService.js
git commit -m "$(cat <<'EOF'
redesign economy score with 5-signal stress model

Replace per-asset summing with stress-points + BREAKPOINTS pattern (mirrors society redesign). Five signals (VIX level, S&P daily/1Y drawdown, HYG 1Y drawdown, 10Y-3M yield curve inversion) are normalized via piecewise-linear stress tables (max 12/12/12/8/6 = 50), summed, and mapped to 0-30 score via scenario-based breakpoints. 30 anchors at 2008/COVID-grade systemic crisis.

External interface (calculateEconomyScore → { economyScore, summary }) unchanged.
EOF
)"
```

---

## Task 2: testRunner.js 통합 dry-run 검증

이 단계는 DB가 필요하다. Task 1의 코드 변경이 다른 서비스(climate, society, solar) 및 AI 코멘터리와 통합되어 정상 동작하는지 확인한다.

**Files:**
- 변경 없음 (검증만)

- [ ] **Step 1: 로컬 DB 기동**

```bash
cd edi-backend && docker compose -f docker-compose.local.yml up -d
```

Expected: `edi-db-local` 컨테이너 정상 기동. 이미 실행 중이면 그대로 진행.

- [ ] **Step 2: testRunner.js 실행**

```bash
cd edi-backend && node testRunner.js
```

Expected:
- Task 1에서 추가한 5개 신호 라인 + `totalStress → score` 라인 출력
- 각 서비스(society, climate, economy, solar) 점수 합산되어 `🧪 DRY RUN 완료. Date: YYYY-MM-DD, Score: NN/100` 출력
- AI Commentary (KO/EN) 정상 생성 (Gemini API 키 있는 경우)
- 경제 점수가 5~12 범위 (±2 여유). totalScore에 자연스럽게 반영됨

- [ ] **Step 3: 결과 메모**

- 사회·기후·경제·태양 점수 각각
- totalScore
- AI 코멘터리 정상 생성 여부
- 콘솔에 표시된 economy 신호별 stress 값 (PR 본문에 첨부 가능)

- [ ] **Step 4: 점수가 예측 범위(5~12)에서 벗어나는 경우 대응**

만약 economyScore가 0 또는 30에 붙는다면 변환 곡선/BREAKPOINTS 재조정 필요. 다음 데이터를 가지고 별도 후속 PR로 처리:
- 실제 측정된 신호별 stress 분포 (며칠~1주 운영)
- 어느 신호가 너무 빠듯/헐거운지

본 PR에서는 코드 변경을 완료하고 머지. 운영 관찰은 스펙의 "미해결 / 추후 검토" 항목에 포함되어 있다.

---

## Task 3: PR 마무리

- [ ] **Step 1: 전체 diff 확인**

```bash
git diff main..HEAD -- edi-backend/services/economyService.js
```

Expected: economyService.js 만 변경됨. 다른 파일 변경 없음.

- [ ] **Step 2: 커밋 그래프 확인**

```bash
git log --oneline main..HEAD -- edi-backend/services/economyService.js docs/superpowers/specs/2026-04-25-economy-score-redesign-design.md docs/superpowers/plans/2026-04-25-economy-score-redesign.md
```

Expected: spec 커밋(`spec: economy score redesign`) + Task 1 커밋 (`redesign economy score with 5-signal stress model`). 자연스러운 시간순.

- [ ] **Step 3: PR 생성 (사용자가 별도 지시한 경우만)**

본 계획은 코드 변경까지를 다룬다. PR 생성은 사용자의 명시적 지시가 있을 때만 수행 (CLAUDE.md 컨벤션 — 자동 PR 생성 금지).

---

## 검증 요약

| Task | 검증 방법 | 기대 결과 |
|---|---|---|
| 1 | REPL 검증 명령 | economyScore **5~12 범위** ← 핵심, 신호별 stress 라인 5개 출력 |
| 2 | testRunner.js dry-run | 통합 동작 정상, totalScore 표시, AI 코멘터리 생성 |
| 3 | git diff/log | economyService.js만 변경, 커밋 그래프 정상 |

## 변경 파일 요약

- `edi-backend/services/economyService.js` (단일 전면 재작성)

다른 어떤 파일도 수정하지 않는다. 스키마, API, 환경변수, 호출부 변경 없음.
