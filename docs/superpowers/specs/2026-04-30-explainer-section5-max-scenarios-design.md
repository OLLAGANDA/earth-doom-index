# Explainer Pages — Section 5 "Max Score Scenarios" Design

**Status:** Draft
**Date:** 2026-04-30
**Scope:** All 4 about-topic explainer pages (society, climate, economy, solar) × KO/EN — 8 MDX files

## Problem

Currently, "what would push this domain to its maximum score" content is buried inside section 4 (and occasionally section 3) as inline prose. Specifically, climate.mdx ends section 4 with a long paragraph about the 1816 Tambora "Year Without a Summer" scenario; solar.mdx scatters Carrington references across sections; economy/society have no explicit max-scenario treatment at all.

The user wants this consolidated into a discrete, structured **section 5** on every page so a reader can quickly answer two questions: "what kind of event would peg this index at its maximum?" and "what historical events approached or reached that threshold?"

## Design

### Structure

Each page gets a new `## 5. 최대 점수 시나리오` (KO) / `## 5. Maximum-Score Scenarios` (EN) section, placed after the existing section 4 and before the `<TopicChart>` / `<CrossLinks>` components.

Each section 5 contains:

1. **One short paragraph** describing the conditions required to peg the domain's maximum (30 for society/climate/economy, 10 for solar). Mentions the curve/calibration rationale where relevant.
2. **One 3-column table** of historical events: `사건 / 연도 / 본 지수 환산(추정)` (KO) and `Event / Year / Estimated index score` (EN). Each table has 4 rows — first row pegs the maximum (DOOM/peg), remaining rows show graded examples.

The "환산(추정)" / "estimated" labeling is critical because most historical events predate the data sources we use (GDELT 1979+, Yahoo Finance ~1y rolling, OpenWeather realtime, NOAA SWPC realtime), so all values are retrospective approximations against the current scoring formulae.

### Content moves (section 4 → 5)

- **climate.mdx KO** — remove the entire "30점 천장은 특정 개념 기준점에…" paragraph (currently the last paragraph of section 4). The condensed scenario logic moves into section 5's intro paragraph.
- **climate.mdx EN** — same pattern: remove the "The 30-point ceiling is anchored to…" paragraph at end of section 4.
- **climate KO/EN section 3** — keep the brief "1816 탐보라급" / "Year Without a Summer following the Tambora eruption" reference there, since it's about curve calibration and serves a different purpose.
- **solar.mdx KO/EN** — Carrington references in section 1 (impact context) and section 4 (flare classification) stay put; they serve their local context. Section 5 is purely additive.
- **society.mdx, economy.mdx** — no existing max-scenario prose to move. Section 5 is purely additive.

### Per-page content

#### Society (0–30, GDELT 1979+)

Intro paragraph theme: 30점에 도달하려면 코드 20(WMD/대량학살) 사건이 다발하거나, 다중 대륙에서 동시에 코드 19(전투)·18(폭격) 보도량이 폭증하는 글로벌 무력 충돌 상태여야 함. CAMEO 가중치 비대칭(코드 20 = 30점 / 코드 14 = 0.2점) 때문에 평시 시위는 30점 근처에 가지 못함.

| 사건 | 연도 | 본 지수 환산(추정) |
|---|---|---|
| 2차대전 진행기 (가설치) | 1939–1945 | ~30 (DOOM) |
| 르완다 학살 | 1994 | ~26–30 (CRITICAL+) |
| 9/11 직후 충격 | 2001 | ~20–24 (DANGER+) |
| 우크라이나 전쟁 발발 | 2022.02– | ~20–24 (DANGER+) |

#### Climate (0–30, 7-city sample)

Intro paragraph theme: 30점은 단일 도시·단일 사건이 아닌 **7개 거점 도시가 동시에 다중 sub-signal에서 극단을 기록**하는 행성급 수렴 상태에서만 도달. 다른 영역의 "핵전쟁"·"대공황"에 해당하는 climate 영역의 시나리오성 임계.

| 사건 | 연도 | 본 지수 환산(추정) |
|---|---|---|
| 탐보라 분화 / "여름 없는 해" | 1815–16 | ~30 (DOOM) |
| 2003 유럽 폭염 | 2003 | ~22–26 (CRITICAL) |
| 2010 러시아 폭염 + 파키스탄 홍수 | 2010 | ~18–22 (DANGER+) |
| 2022 파키스탄 대홍수 | 2022 | ~12–15 (단일 지역 극단) |

#### Economy (0–30, 5-signal aggregate)

Intro paragraph theme: 30점은 5개 신호(VIX, S&P 일변동, S&P 1y drawdown, HYG drawdown, 수익률곡선)가 **동시에** 임계 영역으로 진입한 상태. 단일 신호의 단발 스파이크(예: VIX 단일 폭등)로는 합산 stress 42점에 못 미쳐 30점 도달이 어려움.

| 사건 | 연도 | 본 지수 환산(추정) |
|---|---|---|
| 대공황 (Black Tuesday 후) | 1929–32 | ~30 (DOOM) |
| 글로벌 금융위기 (Lehman) | 2008.09– | ~24–30 (CRITICAL+) |
| COVID 크래시 | 2020.03 | ~20–26 (DANGER+) |
| Black Monday | 1987.10 | ~14–18 (단발 변동성) |

#### Solar (0–10, Kp + flare)

Intro paragraph theme: 10점에 도달하려면 **Kp 9급 G5 폭풍과 X급 플레어가 동시에** 발생해야 함. 이 둘이 동시에 일어나는 사례는 강력한 태양 이벤트가 보통 CME와 플레어를 같이 동반하기 때문에 가능하지만, 평시에는 0~1점이 정상.

| 사건 | 연도 | 본 지수 환산(추정) |
|---|---|---|
| 캐링턴 사건 (X45+ 추정 + G5+) | 1859 | ~10 (peg) |
| 할로윈 폭풍 (G5 + X28) | 2003.10 | ~9 |
| Gannon storm (G5) | 2024.05 | ~7–8 |
| 퀘벡 블랙아웃 (G4) | 1989.03 | ~6–7 |

### EN content

EN versions translate the same intro paragraph + table, with English event names ("Year Without a Summer / Tambora", "Halloween storms (G5 + X28)", etc.). Table headers: `Event / Year / Est. index score`.

### Heading / numbering

- Existing pages have sections 1–4; new section becomes ## 5. The existing `<TopicChart>` and `<CrossLinks>` components stay at the bottom (after section 5).
- climate.mdx: removing the trailing paragraph of section 4 leaves section 4 ending on the cold-threshold rationale, which reads cleanly.

### Out of scope

- methodology.mdx: not in user's list, no change.
- Updating the chart, score formula, or backend.
- Citations / footnotes for historical events. Numbers are explicitly labeled "추정 / estimated" — no academic-grade citation work needed.
- Rebalancing scoring formulae to actually verify the estimated peg values. The estimates are a reader-facing approximation, not a backend assertion.

## Acceptance

- All 8 MDX files have a `## 5.` section with the prescribed intro + 4-row table.
- climate.mdx KO/EN's section 4 no longer ends with the 1816 paragraph (moved/condensed into section 5 intro).
- Tables render correctly on mobile (already handled by the mobile-overflow fix in 869a2f3).
- No backend changes, no JSX changes — pure MDX content edits.
