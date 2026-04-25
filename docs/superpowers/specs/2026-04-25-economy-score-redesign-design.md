# 경제 위협 지수 (Economy Score) 재설계

## 배경

현재 `economyService.js`는 **변동률 기반 자산 점수의 단순 합산** 구조다. 4개 신호(S&P 500 일변동, 금 일변동, WTI 일변동, VIX 레벨)를 각각 0~10점으로 채점한 뒤 합산하여 30점에 clamp한다.

이 구조는 두 가지 문제가 있다.

1. **단발성 일변동에만 반응**한다. 누적된 약세장, 신용 스프레드 확대, 수익률곡선 역전 같은 **구조적 위기 신호**를 잡지 못한다. 1929~33 같은 장기 침체나 2008 금융위기의 진행 과정은 점수에 반영되지 않는다.
2. **만점 도달 조건이 비현실적**이다. 30점에 도달하려면 S&P -6%, 금 +12%, 원유 +18%, VIX 60+가 동시에 발생해야 한다. 역사적으로 2008 리먼주간이나 COVID 폭락 같은 진짜 시스템 위기에서도 이 조건은 충족된 적이 없다.

사용자 직관: **30점은 2008 리먼주간 / COVID 폭락 같은 시스템 위기 peak에서 도달해야 하는 값**이다. 일변동률 합산만으로는 이 의도를 충족할 수 없다.

## 목표

- 30점이 의미를 회복한다: 2008 리먼주간·COVID 폭락 같은 시스템 위기 peak가 **27~30점 영역**에 안착. 30 만점은 모든 신호가 동시 극단치를 찍는 조건(2008/COVID보다 약간 더 극단적인 가상 상황 또는 사상 최악일 때)에서만 도달.
- 평시·일상 변동·약세장·신용위기·시스템위기가 점수상에서 명확히 구분된다.
- **단일 신호 위기**(예: HYG 단독 폭락)도 점수에 충분히 반영된다 (단일 신호로 ~20점까지 도달 가능).
- 백필 없이 즉시 적용 가능하다.
- 현재 Yahoo Finance 인프라 그대로 사용 (외부 API 추가 없음).

## 비목표

- FRED API 등 신규 데이터 소스 도입. Yahoo Finance ETF/Index 가격으로 모든 신호 도출.
- 거시경제 지표 (실업률, GDP) 도입. "오늘의 위협" 컨셉에 너무 느린 지표.
- 경제 점수 외 다른 지수(climate, society, solar) 변경.
- 과거 economy_score 백필 / 재계산.
- 임계 사건 트리거(하드 floor) 도입. 모든 점수는 단일 공식으로 산출.

## 설계 개요

세 가지 변경을 결합한다.

1. **신호 다변화**: 단발 변동률(VIX, S&P 일변동) + 누적 추세(S&P 1년(`range=1y`) drawdown, HYG 1년(`range=1y`) drawdown) + 거시구조(수익률곡선 역전) **5개 신호**.
2. **stress points 합산**: 각 신호를 정규화된 "스트레스 포인트"(0~12 또는 0~6)로 환산. 이질적 단위(% / bp / level)를 동일 스케일로 통합.
3. **시나리오 기반 BREAKPOINTS**: totalStress 합산값을 7구간 선형보간으로 0~30점에 매핑. society 패턴과 동일.

기존 가산식(자산별 max score 후 합산 clamp) 대신, society 재설계 패턴(가중합산 후 BREAKPOINTS 매핑)을 따른다.

## 신호 5개

| 신호 | 측정 | Max stress | 역할 |
|---|---|---:|---|
| **VIX 레벨** | `^VIX` 현재가 | 12 | 단기 패닉 (옵션시장 가격) |
| **S&P 1년(`range=1y`) drawdown** | `^GSPC` 1년(`range=1y`) 고점 대비 낙폭 % | 12 | 누적된 약세장 척도 |
| **HYG drawdown** | `HYG` 1년(`range=1y`) 고점 대비 낙폭 % | 12 | 신용 스트레스 (HY 채권 ETF — FRED HY OAS 대용) |
| **수익률곡선 (10Y-3M)** | `^TNX − ^IRX` (단위: bp) | 8 | 침체 예고 — 선행지표, peak에서 정상화 경향 |
| **S&P 일변동률** | `^GSPC` 전일 대비 % | 6 | 단발 충격 — 노이즈성, 보조 |
| **합계 max** | | **50** | |

### 가중치 설계 의도

- 본격 위기 신호 3개(VIX, S&P drawdown, HYG drawdown)에 동등한 12점 부여. 단일 신호 위기도 충분히 표현 가능.
- 수익률곡선은 **선행 지표** — 위기 peak에서는 Fed 금리인하로 곡선이 정상화되는 경향이 있어 8점만 부여. peak 직전에 firing해서 19~24점 영역을 채우는 역할.
- S&P 일변동률은 노이즈성 단발 신호. 단독으로는 큰 의미 없으므로 6점만.
- 합 max 50 → BREAKPOINTS로 30 매핑 → **4개 신호만 firing해도 30 도달 가능** (현실 반영: 위기 peak에서 곡선이 빠지는 패턴).

### HYG 선택 근거 (FRED 비용 절감)

FRED `BAMLH0A0HYM2` (HY 신용스프레드 OAS)가 신용 스트레스의 정석 지표지만, FRED API 키 발급/관리 부담이 있다. HYG ETF 가격은 HY 채권 가격을 추종하므로:

- HYG 가격 ↓ = HY 스프레드 ↑ (일일 상관계수 -0.85 이상)
- 1년(`range=1y`) drawdown 형태로 사용하면 단기 노이즈 흡수
- 단점: 금리변동 영향 혼재 (2022년처럼 "금리 상승만으로 ETF 하락"한 경우 신용위기로 오인 가능). 이는 임계값 보수적 설정으로 완화.

## 새 공식

각 신호별 stress 변환은 **piecewise linear** — 아래 표의 인접 두 점 사이에서 선형보간, 첫 점 미만에서는 첫 점의 stress(0), 마지막 점 초과에서는 마지막 점의 stress(max)로 clamp.

구현은 society의 `calcScore` 패턴과 동일한 `BREAKPOINTS` 배열 + `lerp(x, x0, x1, y0, y1)` 헬퍼를 신호별로 적용한다.

### 신호별 변환표 (`{input → stress}`)

| 신호 | 입력 단위 | 변환 점들 |
|---|---|---|
| **VIX** | level | 12→0, 15→1, 20→3, 30→6, 40→9, 60→12 |
| **S&P drawdown** | abs(%) | 5→0, 10→2, 20→5, 30→8, 40→11, 50→12 |
| **HYG drawdown** | abs(%) | 3→0, 7→2, 12→5, 18→8, 22→11, 25→12 |
| **수익률곡선 inversion** | abs(bp) | 0→0, 30→1, 50→3, 100→5, 150→7, 200→8 |
| **S&P 일변동률** | abs(%) | 1→0, 2→2, 3→3, 5→5, 7→6 |

수익률곡선은 부호가 양수(정상)이면 inversion_bp = 0으로 처리하여 stress=0.

### 합산 및 매핑

```
totalStress = vix_stress + sp_dd_stress + hyg_dd_stress + curve_stress + sp_daily_stress
score       = round( lerp(totalStress, BREAKPOINTS) )  // 0~30
```

### BREAKPOINTS

| totalStress | score |
|---:|---:|
| 0 | 0 |
| 5 | 3 |
| 12 | 8 |
| 20 | 14 |
| 28 | 20 |
| 36 | 26 |
| 42 | 30 |

`totalStress >= 42` 면 30으로 clamp.

선형 보간으로 구간 내 점수 산출.

### 라벨 (summary 필드)

`totalStress` 기준 6단계:

| totalStress | 라벨 |
|---|---|
| ≥ 36 | 시스템 위기 (2008·COVID급) |
| ≥ 28 | 본격적 위기·신용 경색 |
| ≥ 20 | 약세장·다중 스트레스 |
| ≥ 12 | 시장 변동성 확대 |
| ≥ 5 | 일상적 시장 변동 |
| < 5 | 글로벌 자산시장 안정 |

`summary` 출력 형식: `${label} (스트레스 ${totalStress.toFixed(0)})`

## 시나리오 검산

| 시나리오 | 합산 stress | score |
|---|---:|---:|
| 평상시 (VIX 13, draw 2%, HYG -1%, curve +30bp) | ~0 | **0** |
| 일상 변동 (VIX 18, draw 8%, HYG -3%, daily -1%) | ~4 | **2~3** |
| **현재 (2026-04, 추정)** | 5~15 | **5~12** |
| 2023 깊은 곡선역전 (VIX 17, draw 10%, HYG -8%, curve -180bp) | ~14 | **10** |
| 본격 약세장 (VIX 30, draw 25%, HYG -17%, curve -50bp, daily -2%) | ~24 | **17** |
| COVID 폭락 peak (VIX 80, draw 32%, HYG -21%, daily -10%) | ~37 | **27** |
| 2008 리먼 peak (VIX 80, draw 40%, HYG -22%, daily -8%) | ~40 | **29** |
| 가상 (모든 신호 동시 극단치) | 50 → clamp 42 | **30** |

추정치는 과거 시계열에 기반한 어림이며, 운영 후 1~2주 관측으로 BREAKPOINTS·곡선 변환 미세 조정 여지가 있다.

## 데이터 소스

Yahoo Finance v8 chart API 그대로 사용. 5개 호출을 `Promise.allSettled`로 병렬화.

| 티커 | range/interval | 추출 |
|---|---|---|
| `^VIX` | `1d`/`1d` | `meta.regularMarketPrice` |
| `^GSPC` | `1y`/`1d` | 종가 시계열 → 전일 대비 변동률 + 1Y max 대비 drawdown |
| `HYG` | `1y`/`1d` | 종가 시계열 → 1Y max 대비 drawdown |
| `^TNX` | `1d`/`1d` | 10Y 수익률 (Yahoo는 % 단위로 반환) |
| `^IRX` | `1d`/`1d` | 13W 수익률 (Yahoo는 % 단위로 반환) |

수익률곡선 inversion (bp) = `(^TNX_yield − ^IRX_yield) × 100`. 음수면 inverted (stress firing), 양수면 정상 (stress=0).

기존 금/원유(GC=F, CL=F) 호출은 제거.

## 코드 변경 범위

`edi-backend/services/economyService.js` **단일 파일 전면 재작성**. 다른 파일 변경 없음.

### 외부 인터페이스 보존

```javascript
const { calculateEconomyScore } = require('./services/economyService');
const { economyScore, summary } = await calculateEconomyScore();
```

- 반환 형태 (`{ economyScore: number, summary: string }`) 동일
- `economyScore` 범위 (0~30 정수) 동일
- 호출부 (`scheduler.js`, `testRunner.js`) 변경 불필요

### 내부 구조

- `CHANGE_ASSETS` 상수 (S&P/금/원유 변동률) → 제거
- `changeToScore`, `vixToScore` 함수 → 5개 신호별 stress 함수로 교체 (`vixStress`, `spDrawdownStress`, `hygDrawdownStress`, `curveStress`, `spDailyStress`)
- `fetchAssetChange` → 시계열 fetch 헬퍼로 일반화 (drawdown 계산 위해 1Y 종가 배열 필요)
- 새 헬퍼: `fetchYieldRate` (단순 현재가)
- `calculateEconomyScore` 본체: 5개 신호 병렬 fetch → stress 합산 → BREAKPOINTS 매핑 → 라벨 부여

### DB 스키마

변경 없음. `economy_score` 컬럼은 0~30 정수 범위 그대로.

### API 응답

변경 없음. 점수 분포만 바뀜.

## 호환성

과거 기록(historical economy_score)은 옛 공식 기준 값이 그대로 남는다. UI 트렌드 차트에서 시각적 단절(step) 발생 가능. society 재설계와 동일하게 **그대로 둠** (백필은 비목표).

→ 데이터 정직성 우선. 필요 시 차트에 "공식 변경: 2026-04-XX" 주석 추가 정도로 충분.

## 오류 처리

- **개별 신호 실패**: `Promise.allSettled` 결과의 `rejected` 신호는 해당 stress를 0으로 간주하고 나머지로 계산 진행. 전체 실패 안 함.
- **시계열 길이 부족**: `^GSPC`/`HYG` 1Y 종가 배열이 비정상적으로 짧으면(예: 30일 미만) drawdown 계산은 가능한 범위로 대체. 빈 배열이면 stress 0.
- **수익률 음수/이상치**: `^TNX`/`^IRX` 가 null이면 곡선 stress 0. 정상 양수 수익률 가정.
- **로그**: 각 신호의 (원시값, stress) 페어를 콘솔에 출력 (society의 mentions 통계 로그 패턴과 유사).
- 콘솔에 어떤 신호가 실패했는지 명시 — 운영 시 데이터 소스 장애 추적용.

## 테스트 전략

별도 단위 테스트 프레임워크가 프로젝트에 없으므로 society와 동일하게 `testRunner.js` dry-run 검증을 사용한다.

### 검증 흐름

1. `cd edi-backend && node -e "require('./services/economyService').calculateEconomyScore().then(r => console.log(JSON.stringify(r, null, 2)))"` 로 새 공식 점수 출력.
2. 출력된 신호별 stress·totalStress·economyScore를 사람이 검토하여 시나리오 표 예측치(현재 5~12점)와 비교.
3. `node testRunner.js` 로 통합 dry-run 검증 (다른 서비스와 합산 동작 확인).
4. 며칠 운영 후 점수 변동 추이 관찰. 만점(30) 또는 0점에 자주 붙으면 BREAKPOINTS 또는 신호 변환 곡선 재조정 필요.

### 콘솔 로그 보강

기존 자산별 한 줄 로그(`  S&P 500: -0.50% (0.0점)`)를 신호별 stress 출력 형태로 교체:

```
  VIX: 18.5 (stress 2.4)
  S&P drawdown: -7.2% (stress 1.4)
  HYG drawdown: -3.1% (stress 0.1)
  Yield curve: -45bp (stress 2.7)
  S&P daily: -0.85% (stress 0.0)
  totalStress: 6.6 → score 4
```

## 마이그레이션·배포

- 코드 머지 후 다음 크론 실행(매일 00:01 UTC) 시점에 자동 적용.
- 별도 마이그레이션 스크립트 불필요.
- 첫 배포 후 24~48시간 점수 관측. 예측 범위(5~12) 밖이면 BREAKPOINTS 또는 변환 곡선 조정 PR.

## 미해결 / 추후 검토

- **운영 데이터 기반 BREAKPOINTS 재캘리브레이션**: 1~3개월 운영 데이터의 누적 분포 percentile 기반으로 자동 조정 메커니즘 검토.
- **HYG 금리민감도 보정**: 2022년처럼 "금리 상승만으로 HYG 하락"한 경우 신용 신호 오발화 가능. 듀레이션-조정 drawdown 또는 IEF(중기국채 ETF) 대비 상대 drawdown 도입 검토.
- **수익률곡선 12개월 rolling max**: peak에서 곡선이 정상화되는 경향을 보완하기 위해, 현재 inversion 대신 12개월 최대 inversion 깊이를 stress로 변환하는 옵션 검토.
- **MOVE 지수 추가**: 채권 변동성 (Yahoo 비제공) — FRED 도입 시점에 함께 추가 가능.
- **레짐 전환 감지**: 단순 임계값 외에 변동성 레짐(낮음→높음 전환) 자체를 신호로 활용하는 통계적 접근 검토.
