# Explainer Pages — Phase 3 (English Content) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 2에서 noindex 처리해 둔 영어 about 페이지에 5개 MDX 본문과 확장된 indexLead를 채워 영어권 SEO 토픽 클러스터를 가동시키고, 모든 콘텐츠가 production-ready인 시점에 noindex를 제거한다.

**Architecture:** 한국어 본문(`src/content/ko/*.mdx`)을 source로 두고, **strict skeleton** (H2 구조/숫자/표 1:1 평행) + **free prose** (산문 native rewrite) 방식으로 영어판 5개 파일을 작성. `i18n.js`의 `en.about.indexLead`를 한국어 분량에 맞춰 3문단으로 확장. 모든 영어 페이지가 채워진 후 `AboutTopic.jsx` / `AboutIndex.jsx` 의 `noindex={lang === 'en'}` 일괄 제거.

**Tech Stack:** React 19, Vite 7, MDX (`@mdx-js/rollup` + `remark-frontmatter` + `remark-mdx-frontmatter`), vite-react-ssg, react-router-dom v6.

**Spec reference:** `docs/superpowers/specs/2026-04-28-explainer-pages-phase3-design.md`

---

## File Structure

```
edi-frontend/src/content/en/
├── society.mdx       NEW   (1,400~1,800 words)
├── climate.mdx       NEW   (1,400~1,800 words)
├── economy.mdx       NEW   (1,800~2,200 words)
├── solar.mdx         NEW   (1,500~1,900 words)
└── methodology.mdx   NEW   (1,500~1,900 words)

edi-frontend/src/i18n.js
└── en.about.indexLead  EXPAND (1 sentence → 3 paragraphs, 350~450 words)

edi-frontend/src/routes/AboutTopic.jsx:59
└── noindex={lang === 'en'}  REMOVE (after all content done)

edi-frontend/src/routes/AboutIndex.jsx:33
└── noindex={lang === 'en'}  REMOVE (after all content done)
```

Each English MDX file has the same import paths and component placement as its Korean counterpart, with `lang="en"` on `<CrossLinks>`.

---

## Task 1: Expand `en.about.indexLead` to 3 paragraphs

**Files:**
- Modify: `edi-frontend/src/i18n.js` (around line 186)

**Reference:**
- Korean source: `edi-frontend/src/i18n.js:84` — `ko.about.indexLead` 3문단 (~621자).
- Tone Glossary: spec section 7.

- [ ] **Step 1: Read the Korean indexLead source**

Read `edi-frontend/src/i18n.js:80-95` to load `ko.about.indexLead` content (3 paragraphs separated by `\n\n`). Note its structure:
- Para 1: What the index measures + 4 domains + data sources per domain
- Para 2: "오늘 지구는 얼마나 망했는가" hook + design intent (slow movement under single-domain volatility, meaningful rise only when multiple domains worsen) + tone declaration ("진지함과 자조 사이")
- Para 3: Card navigation prompt + methodology page mention + disclaimer

- [ ] **Step 2: Draft English `indexLead` mirroring 3-paragraph structure**

Write 3 paragraphs (350~450 words total) following the Korean structure:

- Para 1 mirror: Earth Doom Index combines threat signals from 4 domains (Society / Climate / Economy / Solar). Society = GDELT protests/conflicts/terror; Climate = OpenWeather extreme weather across 7 cities; Economy = Yahoo Finance 5 market stress signals; Solar = NOAA SWPC geomagnetic storms + X-class flares.
- Para 2 mirror: Hook "How doomed is Earth today?" framed as a half-joking question answered with data. Design intent: single-domain swing (e.g., stock market) moves the score slowly; meaningful rise only when multiple domains deteriorate together. Tone declaration: "an index walking the narrow line between earnest and self-deprecating."
- Para 3 mirror: Click cards below to see per-domain calculation. Aggregation into 0-100 + 6-tier risk grading is on the methodology page. Disclaimer: not designed for academic research or policy/investment decisions.

Keep the Korean's playful gallows humor in the English (per spec section 7). Use English equivalents from Tone Glossary verbatim for signature phrases.

- [ ] **Step 3: Replace the existing `en.about.indexLead` value**

Open `edi-frontend/src/i18n.js`. Locate the `en.about.indexLead` line (currently around line 186):

```js
indexLead: 'Earth Doom Index combines threat signals from four domains. Explore how each is measured and sourced.',
```

Replace with the 3-paragraph version using `\n\n` separators (single quotes need escaping for apostrophes, or use template literal). Match the format of the Korean version (single string with `\n\n` between paragraphs).

- [ ] **Step 4: Build to verify SSG renders**

Run: `npm run build`
Expected: Build succeeds. `dist/en/about.html` is regenerated. No new errors.

- [ ] **Step 5: Visual check**

Run: `npm run dev`. Open `http://localhost:5173/en/about`.
Expected: 3 paragraphs displayed. No `\n\n` literal text. Lead reads naturally in English.

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: No new errors.

- [ ] **Step 7: Commit**

```bash
git add edi-frontend/src/i18n.js
git commit -m "feat(frontend): expand en about indexLead to 3 paragraphs (Phase 3)"
```

---

## Task 2: Write `en/society.mdx`

**Files:**
- Create: `edi-frontend/src/content/en/society.mdx`

**Reference:**
- Korean source: `edi-frontend/src/content/ko/society.mdx` (4 H2 sections, ~2,200자)
- Spec sections 5 (strict skeleton), 6 (free prose), 7 (tone glossary), 8 (KR-specific handling).

**Strict skeleton constraints (must match Korean 1:1):**
- 4 H2 sections (개수/순서/주제 동일):
  - 1. What this index actually measures (`이 지수란 무엇인가`)
  - 2. Where the data comes from (GDELT) (`데이터 출처`)
  - 3. How the score is calculated (`계산 방식`)
  - 4. CAMEO root codes and weights (`CAMEO 코드 분류와 가중치`)
- CAMEO weights table (5 rows, 2 columns) — exact Korean values:
  - 20: 30 / 19: 5 / 18: 4 / 17·15·13: 1 each / 14: 0.2
- BREAKPOINTS array `[50, 200, 500, 1000, 2000, 4000]` mentioned exactly.
- 0~30 score range mentioned.
- `log10(mentions + 1)` formula mentioned.
- 15-minute GDELT window mentioned.

- [ ] **Step 1: Read the spec**

Read `docs/superpowers/specs/2026-04-28-explainer-pages-phase3-design.md` sections 5, 6, 7, 8 (strict skeleton, free prose, tone glossary, KR-specific handling).

- [ ] **Step 2: Read the Korean source**

Read `edi-frontend/src/content/ko/society.mdx` end-to-end. Identify each H2's content, the table, and the 4-paragraph lead structure.

- [ ] **Step 3: Create the English file with frontmatter + imports**

Create `edi-frontend/src/content/en/society.mdx` starting with:

```mdx
---
title: "What is the Society Threat Index? — GDELT-based Global Conflict Tracking | Earth Doom Index"
description: "How Earth Doom Index measures protests, armed conflicts, and terror events worldwide using GDELT news data and CAMEO codes — converted to a 0–30 score."
keywords: ["GDELT", "CAMEO codes", "social conflict index", "geopolitical risk"]
publishedAt: "2026-04-28"
---

export const meta = {
  title: "What is the Society Threat Index? — GDELT-based Global Conflict Tracking | Earth Doom Index",
  description: "How Earth Doom Index measures protests, armed conflicts, and terror events worldwide using GDELT news data and CAMEO codes — converted to a 0–30 score.",
  publishedAt: "2026-04-28",
}

import TopicChart from '../../components/TopicChart.jsx'
import CrossLinks from '../../components/CrossLinks.jsx'

# What is the Society Threat Index?
```

- [ ] **Step 4: Write the lead paragraph**

Write 1 lead paragraph (3-5 sentences) immediately after H1 — mirroring Korean lead. Mention: GDELT, protests/armed conflict/terror, CAMEO, asymmetric weighted sum, 0~30 score, daily 15-minute window snapshot, Korean's playful framing of "how loud was Earth today." Bold key phrase **Society Threat Index** with `**...**`.

- [ ] **Step 5: Write H2 section 1 — What this index actually measures**

```mdx
## 1. What this index actually measures
```

Followed by 1-2 paragraphs (free prose). Cover: this is the "social chaos at planetary scale" axis among the 4 domains; measurement target = global, not country-specific; what kind of events × where × frequency × media coverage volume. End with framing that this is "how much noise the planet generated today" rather than political analysis.

- [ ] **Step 6: Write H2 section 2 — Where the data comes from**

```mdx
## 2. Where the data comes from
```

Followed by 1-2 paragraphs covering: GDELT V2 (Global Database of Events, Language, and Tone), Georgetown origin, 100+ languages, real-time parsing, event normalization, 15-minute export interval, `lastupdate.txt` → ZIP streaming, free/public license, English-language media bias as a structural caveat.

- [ ] **Step 7: Write H2 section 3 — How the score is calculated**

```mdx
## 3. How the score is calculated
```

Followed by 3-step breakdown (use numbered (1) (2) (3) format like Korean):
- (1) Event extraction — CAMEO root codes 13/14/15/17/18/19/20 selected, all non-threat codes (diplomacy/mediation/agreement) discarded.
- (2) Weighted sum — exact weights: 20=30, 19=5, 18=4, 17/15/13=1 each, 14=0.2. `log10(mentions + 1)` correction so heavily-reported events count more.
- (3) Score conversion — 7-segment BREAKPOINTS `[50, 200, 500, 1000, 2000, 4000]` linearly interpolated to 0~30 integer.

- [ ] **Step 8: Write H2 section 4 — CAMEO root codes and weights**

```mdx
## 4. CAMEO root codes and weights
```

Followed by 1-2 paragraphs explaining: CAMEO = Conflict and Mediation Event Observations, standard taxonomy in political science, 200+ subcodes, this index uses only root codes (top-2 digits) of threat categories. Then explain the asymmetric weighting rationale: protests (code 14) = always-on noise (thousands daily even in calm times), mass violence (code 20) = single-event planetary threshold; equal weighting would let noise drown out signal; 30 vs 0.2 (150× ratio) is a deliberate guardrail.

Then add the table:

```mdx
| Code | Category | Weight |
|---|---|---|
| 20 | Unconventional mass violence (terror, genocide, WMD) | 30 |
| 19 | Combat / armed conflict | 5 |
| 18 | Assault, bombing, physical attack | 4 |
| 17 | Coercion, sanctions, blockade | 1 |
| 15 | Display of military force | 1 |
| 13 | Threat / intimidation | 1 |
| 14 | Protest / demonstration | 0.2 |
```

- [ ] **Step 9: Append components at the end**

```mdx
<TopicChart kind="society" days={30} />

<CrossLinks current="society" lang="en" />
```

- [ ] **Step 10: Build to verify SSG**

Run: `npm run build`
Expected: `dist/en/about/society.html` regenerated, no errors. Word count of new file ≈ 1,400~1,800 words.

- [ ] **Step 11: Visual check**

Run: `npm run dev`. Open `http://localhost:5173/en/about/society`.
Expected: H1, lead, 4 H2 sections, table renders correctly (5 rows + header), TopicChart loads 30-day data, CrossLinks shows 4 sibling English topic labels. No Korean text leaking.

- [ ] **Step 12: Lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 13: Commit**

```bash
git add edi-frontend/src/content/en/society.mdx
git commit -m "feat(frontend): write en society.mdx (Phase 3)"
```

---

## Task 3: Write `en/climate.mdx`

**Files:**
- Create: `edi-frontend/src/content/en/climate.mdx`

**Reference:**
- Korean source: `edi-frontend/src/content/ko/climate.mdx` (4 H2 sections, ~2,300자)
- Spec sections 5, 6, 7, 8.

**Strict skeleton constraints:**
- 4 H2 sections:
  - 1. What this index actually measures (`이 지수란 무엇인가`)
  - 2. Where the data comes from (OpenWeather + 7 cities) (`데이터 출처`)
  - 3. How the score is calculated (per-city 0~6) (`계산 방식`)
  - 4. Extreme weather thresholds (`이상 기상 임계값`)
- 7 cities exact: Seoul, New York, Mumbai, Tokyo, Sydney, Cairo, Moscow.
- City score formula: `feels_like(0~2) + extreme_weather/wind(0~2) + heat-humidity stress(0~1) + AQI(0~1)` = max 6.
- Temperature thresholds: 30°C and −10°C (rationale: WHO heat guideline + operational threshold for cold cities).
- Wind tiers: hurricane 32.7 m/s+ = 2.0; storm 24.5+ = 1.5; gale 17.2+ = 0.8.
- Score cap: `Math.min(Math.round(score), 30)` — theoretical max 42 (6×7), practical 30 cap.
- Weather codes table (10 rows, 3 columns).

- [ ] **Step 1: Read the spec**

Read `docs/superpowers/specs/2026-04-28-explainer-pages-phase3-design.md` sections 5, 6, 7, 8.

- [ ] **Step 2: Read the Korean source**

Read `edi-frontend/src/content/ko/climate.mdx` end-to-end.

- [ ] **Step 3: Create the file with frontmatter + imports**

```mdx
---
title: "What is the Climate Threat Index? — Extreme Weather Across 7 Cities | Earth Doom Index"
description: "How Earth Doom Index measures extreme weather, heat-humidity stress, and air quality across 7 global anchor cities using OpenWeather — converted to a 0–30 score."
keywords: ["climate threat", "OpenWeather", "extreme weather", "heat index", "air quality"]
publishedAt: "2026-04-28"
---

export const meta = {
  title: "What is the Climate Threat Index? — Extreme Weather Across 7 Cities | Earth Doom Index",
  description: "How Earth Doom Index measures extreme weather, heat-humidity stress, and air quality across 7 global anchor cities using OpenWeather — converted to a 0–30 score.",
  publishedAt: "2026-04-28",
}

import TopicChart from '../../components/TopicChart.jsx'
import CrossLinks from '../../components/CrossLinks.jsx'

# What is the Climate Threat Index?
```

- [ ] **Step 4: Write the lead paragraph**

1 paragraph after H1: OpenWeather, 7 anchor cities, extreme temperature + weather codes + heat-humidity + AQI, 0~30, "how rough Earth's surface moved today" framed as city-sample estimation. Bold **Climate Threat Index**.

- [ ] **Step 5: Write H2 section 1 — What this index actually measures**

```mdx
## 1. What this index actually measures
```

1-2 paragraphs: physical environment among 4 domains, short-term weather hazards (heat/cold/tornado/thunderstorm/wind/heat-humidity/pollution), explicitly NOT long-term climate change tracking. 7-city averaging behavior — single cyclone in one city vs simultaneous extremes across continents.

- [ ] **Step 6: Write H2 section 2 — Where the data comes from**

```mdx
## 2. Where the data comes from
```

Cover: OpenWeatherMap API, two endpoints (Current Weather: feels-like / humidity / wind / weather code; Air Pollution: lat-long AQI 1-5). 7 anchor cities with rationale (East Asia / North America / South Asia / Oceania / Africa / Russia coverage; hot-dry / hot-humid / temperate / cold diversity). Free tier, per-minute rate limit, `Promise.allSettled` city isolation. Use city names: Seoul, New York, Mumbai, Tokyo, Sydney, Cairo, Moscow.

- [ ] **Step 7: Write H2 section 3 — How the score is calculated**

```mdx
## 3. How the score is calculated
```

City score formula:
**City score = feels-like temperature (0~2) + extreme weather code or wind (0~2) + heat-humidity stress (0~1) + AQI (0~1) = max 6**

Then explain:
- Feels-like: above 30°C → `(feels_like − 30) ÷ 10 × 2`, below −10°C → `(−10 − feels_like) ÷ 10 × 2`, both clipped at 2.
- Wind tiers (step function): hurricane 32.7 m/s+ → 2.0; storm 24.5+ → 1.5; gale 17.2+ → 0.8.
- Take **max** of weather code score vs wind score (avoids double-counting same event).
- AQI normalization: `(aqi − 1) ÷ 4` for 0~1.
- Final: sum of 7 city scores, clipped at 30 — theoretical 42 ceiling but practically 30 since simultaneous extremes are rare.

- [ ] **Step 8: Write H2 section 4 — Extreme weather thresholds**

```mdx
## 4. Extreme weather thresholds
```

1 paragraph intro: OpenWeather uses WMO-derived 200~800 codes. List which codes the index counts as threats.

Then table:

```mdx
| Code | Description | Score |
|---|---|---|
| 781 | Tornado | 2.0 |
| 762 | Volcanic ash | 1.8 |
| 504 | Extreme rainfall | 1.8 |
| 711 | Wildfire smoke | 1.5 |
| 771 | Squall | 1.2 |
| 503 | Very heavy rain | 1.2 |
| 511 | Freezing rain | 1.2 |
| 731·751·761 | Sand / dust storm | 1.2 |
| 200~232 | Thunderstorm group | 1.2 |
| 502 | Heavy rain | 0.8 |
```

After table, 1 paragraph rationale: 30°C from WHO heat guideline (health risk threshold), −10°C operational threshold to absorb cold cities (Moscow / New York winter) without runaway score spikes.

- [ ] **Step 9: Append components at the end**

```mdx
<TopicChart kind="climate" days={30} />

<CrossLinks current="climate" lang="en" />
```

- [ ] **Step 10: Build to verify SSG**

Run: `npm run build`
Expected: `dist/en/about/climate.html` regenerated, no errors.

- [ ] **Step 11: Visual check**

Run: `npm run dev`. Open `http://localhost:5173/en/about/climate`.
Expected: H1, lead, 4 H2 sections, weather codes table renders (10 rows + header), TopicChart loads, CrossLinks works. No Korean leakage.

- [ ] **Step 12: Lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 13: Commit**

```bash
git add edi-frontend/src/content/en/climate.mdx
git commit -m "feat(frontend): write en climate.mdx (Phase 3)"
```

---

## Task 4: Write `en/economy.mdx`

**Files:**
- Create: `edi-frontend/src/content/en/economy.mdx`

**Reference:**
- Korean source: `edi-frontend/src/content/ko/economy.mdx` (4 H2 sections, ~2,800자)
- Spec sections 5, 6, 7, 8.

**Strict skeleton constraints:**
- 4 H2 sections:
  - 1. What this index actually measures
  - 2. Where the data comes from (Yahoo Finance)
  - 3. How the score is calculated (5-signal stress sum)
  - 4. Anatomy of the 5 stress signals
- Section 4 has 5 H3 subsections (one per signal): VIX / S&P daily change / S&P 1-year drawdown / HYG drawdown / Yield curve.
- 5 tickers: ^GSPC, HYG, ^VIX, ^TNX, ^IRX. Yahoo endpoint: `query1.finance.yahoo.com/v8/finance/chart/{ticker}`.
- SCORE_BREAKPOINTS exact: `[(0,0), (5,3), (12,8), (20,14), (28,20), (36,26), (42,30)]`.
- Each signal's piecewise stress thresholds (verbatim from Korean):
  - VIX: 12→0, 15→1, 20→3, 30→6, 40→9, 60→12.
  - S&P daily change abs: 1%→0, 2%→2, 3%→3, 5%→5, 7%→6.
  - S&P 1Y drawdown: 5%→0, 10%→2, 20%→5, 30%→8, 40%→11, 50%→12.
  - HYG drawdown: 3%→0, 7%→2, 12%→5, 18%→8, 22%→11, 25%→12.
  - Yield curve (10Y−3M, bp): positive→0; negative absolute value: 0→0, 30→1, 50→3, 100→5, 150→7, 200→8.

- [ ] **Step 1: Read the spec**

Read `docs/superpowers/specs/2026-04-28-explainer-pages-phase3-design.md` sections 5, 6, 7, 8.

- [ ] **Step 2: Read the Korean source**

Read `edi-frontend/src/content/ko/economy.mdx` end-to-end.

- [ ] **Step 3: Create the file with frontmatter + imports**

```mdx
---
title: "What is the Economy Threat Index? — 5 Market Stress Signals | Earth Doom Index"
description: "How Earth Doom Index combines VIX, S&P 500, high-yield bonds, and the yield curve into a 0–30 economy threat score using 5 stress signals from Yahoo Finance."
keywords: ["economy threat", "VIX", "S&P 500", "yield curve", "high-yield"]
publishedAt: "2026-04-28"
---

export const meta = {
  title: "What is the Economy Threat Index? — 5 Market Stress Signals | Earth Doom Index",
  description: "How Earth Doom Index combines VIX, S&P 500, high-yield bonds, and the yield curve into a 0–30 economy threat score using 5 stress signals from Yahoo Finance.",
  publishedAt: "2026-04-28",
}

import TopicChart from '../../components/TopicChart.jsx'
import CrossLinks from '../../components/CrossLinks.jsx'

# What is the Economy Threat Index?
```

- [ ] **Step 4: Write the lead paragraph**

1 paragraph: 5 signals (VIX volatility / S&P daily change + 1-year drawdown / HYG drawdown / 10Y-3M yield curve) collected daily, each converted to stress points, summed to 0~30. Focus on **simultaneous worsening of multiple signals** rather than single-indicator volatility. Bold **Economy Threat Index**.

- [ ] **Step 5: Write H2 section 1 — What this index actually measures**

```mdx
## 1. What this index actually measures
```

1-2 paragraphs: capital/financial system axis among 4 domains. Daily market stress, not quarterly/monthly macro indicators (GDP / unemployment). Why 5 signals rather than 1: systemic crises light up across multiple asset classes simultaneously.

- [ ] **Step 6: Write H2 section 2 — Where the data comes from**

```mdx
## 2. Where the data comes from
```

Cover: Yahoo Finance unofficial chart endpoint (`query1.finance.yahoo.com/v8/finance/chart/{ticker}`), no auth, free, supports 1-year time series (`range=1y, interval=1d`) and current quote.

Then list 5 tickers:

```mdx
- **^GSPC** — S&P 500 (US large-cap)
- **HYG** — iShares iBoxx High Yield Corporate Bond ETF
- **^VIX** — CBOE Volatility Index
- **^TNX** — 10-year US Treasury yield
- **^IRX** — 13-week T-bill rate
```

End with: `Promise.allSettled` parallel collection, partial failure isolation.

- [ ] **Step 7: Write H2 section 3 — How the score is calculated**

```mdx
## 3. How the score is calculated
```

3-step breakdown:
- (1) Per-signal piecewise linear conversion to stress points (0~12, yield curve only 0~8). Small swings near 0; rapid escalation in critical zones.
- (2) Stress sum — simple sum of 5 signals. Theoretical max ~50, but 30+ is already systemic crisis territory.
- (3) 0~30 conversion: `SCORE_BREAKPOINTS = [(0,0), (5,3), (12,8), (20,14), (28,20), (36,26), (42,30)]` linearly interpolated then `Math.round`. Sum ≥ 42 clips at 30.

End with note: this 5-signal model replaced an earlier single-volatility model. Single-signal spikes (like a one-off VIX jump) no longer dominate; meaningful score rises only when multiple signals deteriorate together.

- [ ] **Step 8: Write H2 section 4 — Anatomy of the 5 stress signals**

```mdx
## 4. Anatomy of the 5 stress signals
```

5 H3 subsections:

```mdx
### VIX (volatility index)
```
1 paragraph: derived from S&P 500 option implied volatility. Calm 12-15 / tense 20+ / panic 30+ / systemic crisis 60+. Stress thresholds: 12→0, 15→1, 20→3, 30→6, 40→9, 60→12.

```mdx
### S&P 500 daily change
```
1 paragraph: **absolute value** of previous-day-close change (rallies count too — both directions are systemic volatility signals). Thresholds: 1%→0, 2%→2, 3%→3, 5%→5, 7%→6.

```mdx
### S&P 500 1-year drawdown
```
1 paragraph: drop from 1-year high. Captures **trend damage** separate from volatility. Thresholds: 5%→0, 10%→2, 20%→5, 30%→8, 40%→11, 50%→12.

```mdx
### HYG drawdown
```
1 paragraph: high-yield corporate bond ETF, 1-year drawdown as credit spread proxy. Credit stress typically follows equity stress, so this acts as the second confirmation of systemic crisis. Thresholds: 3%→0, 7%→2, 12%→5, 18%→8, 22%→11, 25%→12.

```mdx
### Yield curve (10Y − 3M)
```
1 paragraph: `^TNX − ^IRX` in basis points. **Negative** = inversion, historically followed by recession within 12-18 months. Positive → 0 stress; negative absolute value: 0bp→0, 30→1, 50→3, 100→5, 150→7, 200→8.

- [ ] **Step 9: Append components at the end**

```mdx
<TopicChart kind="economy" days={30} />

<CrossLinks current="economy" lang="en" />
```

- [ ] **Step 10: Build to verify SSG**

Run: `npm run build`
Expected: `dist/en/about/economy.html` regenerated, no errors.

- [ ] **Step 11: Visual check**

Run: `npm run dev`. Open `http://localhost:5173/en/about/economy`.
Expected: H1, lead, 4 H2 sections, 5 H3 subsections under section 4, all tickers and thresholds present, TopicChart loads, CrossLinks works. No Korean leakage.

- [ ] **Step 12: Lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 13: Commit**

```bash
git add edi-frontend/src/content/en/economy.mdx
git commit -m "feat(frontend): write en economy.mdx (Phase 3)"
```

---

## Task 5: Write `en/solar.mdx`

**Files:**
- Create: `edi-frontend/src/content/en/solar.mdx`

**Reference:**
- Korean source: `edi-frontend/src/content/ko/solar.mdx` (4 H2 sections, ~2,400자)
- Spec sections 5, 6, 7, 8.

**Strict skeleton constraints:**
- 4 H2 sections:
  - 1. What this index actually measures
  - 2. Where the data comes from (NOAA SWPC)
  - 3. How the score is calculated
  - 4. Kp index and X-class flares
- Section 4 has 2 H3 subsections: Kp index / X-class flares.
- Score: `Math.min(kpScore + flareScore, 10)` where Kp=0~7, flare=0~3.
- Endpoints: `planetary_k_index_1m.json` (1-minute Kp, last sample), `goes/primary/xrays-1-day.json` (24h max of 0.1~0.8nm long band).
- Kp piecewise: <4 → 0, ≥9 → 7, linear between.
- X-ray piecewise: M1~M5 (1e-5 ~ 5e-5 W/m²) → 0~1.5; M5~X1 (5e-5 ~ 1e-4) → 1.5~2.5; ≥X1 → 2.5~3.
- Kp NOAA grade table (7 rows, 4 columns) — exact rows from Korean source.

**Note on `<strong>` usage:** The Korean source uses `<strong>(...)</strong>` instead of `**...**` for 3 instances where bold ends with `)` followed by Korean letter (CommonMark right-flanking issue). English doesn't have this problem — use plain `**...**` for emphasis.

- [ ] **Step 1: Read the spec**

Read `docs/superpowers/specs/2026-04-28-explainer-pages-phase3-design.md` sections 5, 6, 7, 8.

- [ ] **Step 2: Read the Korean source**

Read `edi-frontend/src/content/ko/solar.mdx` end-to-end.

- [ ] **Step 3: Create the file with frontmatter + imports**

```mdx
---
title: "What is the Solar Threat Index? — Kp Storms and X-class Flares | Earth Doom Index"
description: "How Earth Doom Index combines real-time NOAA SWPC data on geomagnetic storms (Kp index) and solar X-ray flares into a 0–10 solar threat score."
keywords: ["solar threat", "Kp index", "geomagnetic storm", "solar flare", "NOAA SWPC"]
publishedAt: "2026-04-28"
---

export const meta = {
  title: "What is the Solar Threat Index? — Kp Storms and X-class Flares | Earth Doom Index",
  description: "How Earth Doom Index combines real-time NOAA SWPC data on geomagnetic storms (Kp index) and solar X-ray flares into a 0–10 solar threat score.",
  publishedAt: "2026-04-28",
}

import TopicChart from '../../components/TopicChart.jsx'
import CrossLinks from '../../components/CrossLinks.jsx'

# What is the Solar Threat Index?
```

- [ ] **Step 4: Write the lead paragraph**

1 paragraph: NOAA SWPC real-time space weather data. Combines **geomagnetic storm intensity (Kp index, 0~7)** + **solar X-ray flare class (0~3)** = 0~10. Why 0~10 instead of 0~30: asymmetric impact of space weather on Earth infrastructure. Bold **Solar Threat Index**.

- [ ] **Step 5: Write H2 section 1 — What this index actually measures**

```mdx
## 1. What this index actually measures
```

1-2 paragraphs: extra-terrestrial environment axis among 4 domains. Two threats from sun: CME-driven geomagnetic storms + flare X-ray bursts. Real impact: GPS accuracy degradation, HF (shortwave) communication blackouts, satellite orbit perturbation, high-latitude grid induced currents. Carrington 1859 reference (telegraph network paralyzed).

- [ ] **Step 6: Write H2 section 2 — Where the data comes from**

```mdx
## 2. Where the data comes from
```

Cover: NOAA SWPC (Space Weather Prediction Center, US National Oceanic and Atmospheric Administration). Two public JSON endpoints:

```mdx
- `planetary_k_index_1m.json` — **1-minute** global Kp index. Service uses the most recent sample (`kp_index`).
- `goes/primary/xrays-1-day.json` — X-ray flux from GOES geostationary satellite. **0.1–0.8nm long band** 24-hour max (standard flare classification baseline).
```

End: `Promise.all` parallel calls. X-ray failure absorbed as 0 so Kp alone can produce a score. Free, real-time, no auth.

- [ ] **Step 7: Write H2 section 3 — How the score is calculated**

```mdx
## 3. How the score is calculated
```

Formula:
**Total = Kp score (0~7) + flare score (0~3)** clipped at 10 (`Math.min(kpScore + flareScore, 10)`).

Why 0~10 vs 0~30 for other domains: in calm times the sun is mostly quiet (0~1 score range), and the meaningful range is narrow; widening the scale would leave the chart permanently bottomed-out. Main screen card label `Max: 10` makes the scale explicit.

Then piecewise linear curve:
- Kp: <4 → 0; ≥9 → 7; linear interpolation between.
- X-ray flux: M1~M5 (1e-5 ~ 5e-5 W/m²) → 0~1.5; M5~X1 (5e-5 ~ 1e-4) → 1.5~2.5; ≥X1 → 2.5~3.

- [ ] **Step 8: Write H2 section 4 — Kp index and X-class flares**

```mdx
## 4. Kp index and X-class flares

### Kp index
```

1 paragraph: standard 0-9 scale for geomagnetic disturbance. NOAA classifies Kp ≥ 5 as **G-rated geomagnetic storm**.

Kp NOAA grade table:

```mdx
| Kp | NOAA Grade | Index Score | Real-world Impact |
|---|---|---|---|
| 0~3 | Quiet | 0 | No impact |
| 4 | Active | 0.8 | Minor magnetic field fluctuation |
| 5 | G1 Minor storm | 2.0 | Light effect on satellite operations |
| 6 | G2 Moderate storm | 3.5 | High-latitude grid voltage swings |
| 7 | G3 Strong storm | 5.0 | GPS degradation, HF interference |
| 8 | G4 Severe storm | 6.5 | Widespread GPS / comms failures |
| 9 | G5 Extreme storm | 7.0 | Carrington-class — grid risk |
```

```mdx
### X-class flares
```

1 paragraph: X-ray flux (W/m²) classification. **A < B < C < M < X** in 5 tiers, each 10× the previous. Index scores from **M-class (1e-5 W/m²)** where comms/radio disruptions begin. X-class can briefly black out shortwave communications across the sunlit hemisphere; the 1859 Carrington event was an X-class case (estimated X45+).

- [ ] **Step 9: Append components at the end**

```mdx
<TopicChart kind="solar" days={30} />

<CrossLinks current="solar" lang="en" />
```

- [ ] **Step 10: Build to verify SSG**

Run: `npm run build`
Expected: `dist/en/about/solar.html` regenerated, no errors.

- [ ] **Step 11: Visual check**

Run: `npm run dev`. Open `http://localhost:5173/en/about/solar`.
Expected: H1, lead, 4 H2 sections, 2 H3 subsections, Kp grade table (7 rows + header), TopicChart loads, CrossLinks works. `**bold**` renders correctly. No Korean leakage.

- [ ] **Step 12: Lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 13: Commit**

```bash
git add edi-frontend/src/content/en/solar.mdx
git commit -m "feat(frontend): write en solar.mdx (Phase 3)"
```

---

## Task 6: Write `en/methodology.mdx`

**Files:**
- Create: `edi-frontend/src/content/en/methodology.mdx`

**Reference:**
- Korean source: `edi-frontend/src/content/ko/methodology.mdx` (4 H2 sections, ~2,400자)
- Spec sections 5, 6, 7, 8.

**Strict skeleton constraints:**
- 4 H2 sections:
  - 1. How DOOM-9000 is calculated (`DOOM-9000 산정 원리`)
  - 2. Domain weights and normalization (`영역별 가중치와 정규화`)
  - 3. Risk tier criteria (`위험 등급 기준`)
  - 4. Update cadence and timing (`데이터 갱신 주기와 시점`)
- Total formula: `totalScore = societyScore + climateScore + economyScore + solarScore`. Society/climate/economy 0~30, solar 0~10 → natural 0~100 sum.
- Domain summary bullets (4 bullets in section 2) with exact thresholds:
  - Society 0~30: CAMEO weights 20:30 / 19:5 / 18:4 / 17·15·13:1 / 14:0.2; BREAKPOINTS [50/200/500/1000/2000/4000].
  - Climate 0~30: 7 cities (Seoul / New York / Mumbai / Tokyo / Sydney / Cairo / Moscow); per-city 0~6.
  - Economy 0~30: 5-signal stress sum; SCORE_BREAKPOINTS [0/5/12/20/28/36/42] → [0/3/8/14/20/26/30].
  - Solar 0~10: Kp(0~7) + flare(0~3).
- Risk tier table (6 rows, 3 columns) — use English danger labels from `i18n.js`:
  - 86~100: OUTCOME IS CLEAR (DOOM)
  - 71~85: BEYOND RECOVERY (CRITICAL)
  - 51~70: NEAR CRITICAL (DANGER)
  - 31~50: ACCELERATING (CAUTION)
  - 16~30: ANOMALY DETECTED (NOTICE)
  - 0~15: PEACEFUL ILLUSION (SAFE)
- Cron: `cron.schedule('1 0 * * *', ..., { timezone: 'UTC' })` at UTC 00:01.
- KST reference dropped (per spec section 8).

**Note:** Methodology.mdx imports only `CrossLinks` (no `TopicChart`). Match Korean exactly.

- [ ] **Step 1: Read the spec**

Read `docs/superpowers/specs/2026-04-28-explainer-pages-phase3-design.md` sections 5, 6, 7, 8.

- [ ] **Step 2: Read the Korean source**

Read `edi-frontend/src/content/ko/methodology.mdx` end-to-end.

- [ ] **Step 3: Create the file with frontmatter + imports**

```mdx
---
title: "Earth Doom Index Methodology — 4 Indices Combined into a Risk Tier"
description: "How Earth Doom Index aggregates Society, Climate, Economy, and Solar threat indices into a 0–100 doom score and assigns a 6-tier risk grade."
keywords: ["Earth Doom Index", "methodology", "risk tier", "DOOM-9000"]
publishedAt: "2026-04-28"
---

export const meta = {
  title: "Earth Doom Index Methodology — 4 Indices Combined into a Risk Tier",
  description: "How Earth Doom Index aggregates Society, Climate, Economy, and Solar threat indices into a 0–100 doom score and assigns a 6-tier risk grade.",
  publishedAt: "2026-04-28",
}

import CrossLinks from '../../components/CrossLinks.jsx'

# Earth Doom Index Methodology
```

- [ ] **Step 4: Write the lead paragraph**

1 paragraph: composite score, **DOOM-9000**, daily 0~100. 4 domains independently calculated, summed, then labeled with 6-tier risk grade. Page covers aggregation formula + tier criteria + update timing in one read.

- [ ] **Step 5: Write H2 section 1 — How DOOM-9000 is calculated**

```mdx
## 1. How DOOM-9000 is calculated
```

1-2 paragraphs: simple sum — `totalScore = societyScore + climateScore + economyScore + solarScore`. Society / climate / economy each 0~30, solar 0~10 → natural 0~100. Different data sources & units (GDELT event-weighted sum / OpenWeather city codes / Yahoo stress points / NOAA Kp+flare) means each domain finishes piecewise linear conversion to its 0~30 (or 0~10) scale before summing. Pre-normalization avoids unit clashes (e.g., VIX 60 vs Kp 7 directly colliding).

- [ ] **Step 6: Write H2 section 2 — Domain weights and normalization**

```mdx
## 2. Domain weights and normalization
```

1 intro line, then 4 bullets:

```mdx
- **Society (0~30)** — GDELT CAMEO root code weighted sum (20:30, 19:5, 18:4, 17·15·13:1, 14:0.2) interpolated through 7-segment BREAKPOINTS [50, 200, 500, 1000, 2000, 4000].
- **Climate (0~30)** — 7 anchor cities (Seoul, New York, Mumbai, Tokyo, Sydney, Cairo, Moscow): per-city feels-like + extreme weather + heat-humidity + AQI scored 0~6, summed, capped at 30.
- **Economy (0~30)** — VIX, S&P daily change, S&P 1-year drawdown, HYG drawdown, yield curve as 5 stress points, summed, then SCORE_BREAKPOINTS [0, 5, 12, 20, 28, 36, 42] → [0, 3, 8, 14, 20, 26, 30] interpolated.
- **Solar (0~10)** — Kp (0~7) + X-ray flare class (0~3). Different scale than other domains; rationale on the Solar Threat page.
```

After bullets, 1 paragraph: **equal weighting** as deliberate design. Subjective weighting like "society matters more than economy" would let designer's politics drive the score. Weights may be revisited once per-domain distributions stabilize over time.

- [ ] **Step 7: Write H2 section 3 — Risk tier criteria**

```mdx
## 3. Risk tier criteria
```

1 intro line: composite score labeled with 6-tier risk grade (matches `dangerLevel` function in `App.jsx` and `getDangerInfo` in `api/og.js`).

Then table (use English labels from i18n.js):

```mdx
| Score | Tier label | Meaning |
|---|---|---|
| 86~100 | OUTCOME IS CLEAR (DOOM) | All 4 domains simultaneously extreme — scenario-class threshold |
| 71~85 | BEYOND RECOVERY (CRITICAL) | Multi-domain crisis, short-term recovery unlikely |
| 51~70 | NEAR CRITICAL (DANGER) | Clear stress in 2-3 domains |
| 31~50 | ACCELERATING (CAUTION) | 1-2 domains elevated above baseline |
| 16~30 | ANOMALY DETECTED (NOTICE) | Slightly above baseline noise |
| 0~15 | PEACEFUL ILLUSION (SAFE) | The usual quiet — though "illusion" is the operative word |
```

After table, 1 paragraph: thresholds are **operational round numbers**, not statistical quantiles. As score history accumulates, may shift to quantile-based recalibration. The "Peaceful Illusion" framing for SAFE = not a claim that 0~15 is actually safe, but a deliberate acknowledgment that **threats this index can't capture** (chronic environmental debt, structural poverty, nuclear balance, etc.) sit always in the background.

- [ ] **Step 8: Write H2 section 4 — Update cadence and timing**

```mdx
## 4. Update cadence and timing
```

1-2 paragraphs: cron runs **once daily at UTC 00:01** (`scheduler.js`'s `cron.schedule('1 0 * * *', ..., { timezone: 'UTC' })`). Right after midnight UTC, parallel calls to all 4 services (GDELT / OpenWeather / Yahoo Finance / NOAA SWPC). Result UPSERTed into `doom_records` table with **target_date as 1-row-per-day key** (re-runs update the same row).

End with: timing aligns with US market close + Yahoo data stabilization, giving the economy domain a clean read of the full day's variation.

(KST reference from Korean source — DROP entirely per spec section 8.)

- [ ] **Step 9: Append components at the end**

```mdx
<CrossLinks current="methodology" lang="en" />
```

(No `<TopicChart>` for methodology — matches Korean exactly.)

- [ ] **Step 10: Build to verify SSG**

Run: `npm run build`
Expected: `dist/en/about/methodology.html` regenerated, no errors.

- [ ] **Step 11: Visual check**

Run: `npm run dev`. Open `http://localhost:5173/en/about/methodology`.
Expected: H1, lead, 4 H2 sections, 4 bullets in section 2, risk tier table (6 rows + header) with English danger labels, no TopicChart, CrossLinks works. No Korean leakage. No KST mention.

- [ ] **Step 12: Lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 13: Commit**

```bash
git add edi-frontend/src/content/en/methodology.mdx
git commit -m "feat(frontend): write en methodology.mdx (Phase 3)"
```

---

## Task 7: Remove `noindex` from English about pages

**Files:**
- Modify: `edi-frontend/src/routes/AboutTopic.jsx:59`
- Modify: `edi-frontend/src/routes/AboutIndex.jsx:33`

**Pre-condition:** Tasks 1-6 complete. All 5 English MDX files written and reviewed. `en.about.indexLead` expanded.

- [ ] **Step 1: Verify all English content is in place**

Run: `npm run build`
Expected: Build succeeds. Check `dist/en/about.html` and all 5 `dist/en/about/*.html` are non-trivial in size (> 4 KiB each, similar to Korean counterparts).

Open each URL in the dev server (`npm run dev`):
- `/en/about` — 3-paragraph lead present, all 5 cards visible.
- `/en/about/society`, `/climate`, `/economy`, `/solar`, `/methodology` — each renders fully.

- [ ] **Step 2: Remove noindex from `AboutTopic.jsx`**

Open `edi-frontend/src/routes/AboutTopic.jsx`. Find line 59:

```jsx
        noindex={lang === 'en'}
```

Delete this entire line. The `<PageHead>` element already has other props that close cleanly without it — verify the JSX is still valid after removal (the `noindex` prop becomes undefined, and `PageHead` will treat absence as `false`).

- [ ] **Step 3: Remove noindex from `AboutIndex.jsx`**

Open `edi-frontend/src/routes/AboutIndex.jsx`. Find line 33:

```jsx
        noindex={lang === 'en'}
```

Delete this entire line. Same JSX validity check as Step 2.

- [ ] **Step 4: Verify `<PageHead>` default behavior**

Read `edi-frontend/src/seo/PageHead.jsx`. Confirm the `noindex` prop defaults to falsy / `false` when absent. (If it doesn't, this task needs an extra step to set explicit `noindex={false}` — but in standard React the prop is `undefined` and any conditional `{noindex && <meta ...>}` correctly skips emission.)

- [ ] **Step 5: Build to verify HTML output**

Run: `npm run build`
Expected: build succeeds. Inspect `dist/en/about.html` and `dist/en/about/society.html` — verify there is **no** `<meta name="robots" content="noindex, follow">` tag in the head. (Korean pages should never have had this; English pages should now also lack it.)

```bash
grep -l "noindex" dist/en/about.html dist/en/about/*.html
```
Expected: no output (no files contain "noindex").

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add edi-frontend/src/routes/AboutTopic.jsx edi-frontend/src/routes/AboutIndex.jsx
git commit -m "feat(frontend): remove noindex from English about pages (Phase 3)"
```

---

## Final Verification

After Task 7, do a final full check before opening the PR.

- [ ] **Step 1: Full build + lint**

```bash
cd edi-frontend
npm run build
npm run lint
```
Expected: clean.

- [ ] **Step 2: All 12 SSG pages built**

Verify all of these exist in `dist/`:

```
dist/index.html
dist/ko.html
dist/en.html
dist/ko/about.html
dist/en/about.html
dist/ko/about/society.html
dist/ko/about/climate.html
dist/ko/about/economy.html
dist/ko/about/solar.html
dist/ko/about/methodology.html
dist/en/about/society.html
dist/en/about/climate.html
dist/en/about/economy.html
dist/en/about/solar.html
dist/en/about/methodology.html
```

- [ ] **Step 3: No Korean text in English pages**

```bash
grep -El "[가-힣]" dist/en/about.html dist/en/about/*.html
```
Expected: no output.

- [ ] **Step 4: No frontmatter leakage**

```bash
grep -E "^title:|^description:|^publishedAt:" dist/en/about/*.html
```
Expected: no matches in body content (frontmatter as YAML should not appear as visible text).

- [ ] **Step 5: Open PR (stacked on Phase 2)**

```bash
git push -u origin feature/explainer-pages-phase3
gh pr create --base feature/explainer-pages-phase2 --title "Phase 3: English explainer pages + noindex removal" --body "$(cat <<'EOF'
## Summary
- 5 English MDX explainer pages: society / climate / economy / solar / methodology
- Expanded `en.about.indexLead` from 1 sentence to 3 paragraphs (~400 words)
- Removed `noindex={lang === 'en'}` from `AboutTopic.jsx` and `AboutIndex.jsx` after content is production-ready

Hybrid approach (per spec): strict skeleton (H2 structure / numbers / tables match Korean 1:1) with free prose (sections written natively in English). Tone glossary maps Korean signature phrases (평온한 착각 → PEACEFUL ILLUSION, 결국 토이 프로젝트 → "ultimately a toy project", etc.) to consistent English equivalents.

Spec: `docs/superpowers/specs/2026-04-28-explainer-pages-phase3-design.md`

## Test plan
- [ ] All 5 English MDX pages render at `/en/about/{topic}`
- [ ] `/en/about` shows 3-paragraph lead + 5 topic cards
- [ ] No Korean text leaking to English pages
- [ ] No `noindex` meta in any English about page HTML
- [ ] All numbers / tables / breakpoints match Korean source 1:1
- [ ] TopicChart renders 30-day data on 4 topic pages (methodology has none)
- [ ] CrossLinks shows English topic labels with correct sibling links

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR opens against `feature/explainer-pages-phase2` base. URL returned for review.
