# Explainer Pages — Phase 3 (English Content) Design

## 1. Overview

Phase 3는 Phase 2에서 noindex 처리해 둔 영어 about 페이지에 **콘텐츠를 채워 영어권 SEO 토픽 클러스터를 가동**한다. 한국어 5개 본문(`society`, `climate`, `economy`, `solar`, `methodology`)과 about 인덱스 리드 문단을 기반으로, 영어 native 독자에게 자연스럽게 읽히는 본문을 작성한다. 모든 본문이 production-ready가 된 시점에 영어 about 페이지의 `noindex` 메타를 일괄 제거해 검색엔진 인덱싱을 활성화한다.

## 2. Out of Scope

- **한국어 본문 수정** — Phase 2에서 마무리됨. Korean canonical, 영어판은 hybrid skeleton으로 평행 작성.
- **메인 화면 / danger 라벨 / 푸터 영어 카피** — 이미 영어로 들어가 있고 톤 일관성 OK.
- **i18n.js의 다른 영역(가짓말 토픽 라벨, 토픽 short description)** — 이미 깔끔하게 작성됨.
- **다국어 추가 (일본어, 중국어 등)** — 현재 ko/en 2개 언어만.
- **SEO 키워드 리서치 자동화** — 자연스러운 키워드 등장만 체크. SEMrush/Ahrefs 등 별도 키워드 리서치는 안 함.

## 3. 작성 방향 (브레인스토밍 결정 사항)

브레인스토밍에서 합의한 방향:

- **Tone**: Match — Korean의 playful gallows humor를 영어 등가 표현으로 살림. 다크 유머 + 자조 유지.
- **Length**: Native rewrite — 사실/숫자는 동일하되 영어 native 톤으로 다시 씀. 분량은 한국어와 비슷한 수준.
- **Scope**: MDX 5개 + `indexLead` 확장. 사이트 전반 카피는 손대지 않음.
- **Structure**: Hybrid — strict skeleton (H2 구조/숫자/표 동일) + free prose (산문 자유 재작성).

## 4. 작업 범위 (Files)

### 4.1 신규 작성

```
edi-frontend/src/content/en/society.mdx       NEW
edi-frontend/src/content/en/climate.mdx       NEW
edi-frontend/src/content/en/economy.mdx       NEW
edi-frontend/src/content/en/solar.mdx         NEW
edi-frontend/src/content/en/methodology.mdx   NEW
```

### 4.2 수정

```
edi-frontend/src/i18n.js
  └── en.about.indexLead — 1문장 → 3문단 (350~450 단어, 한국어판 분량 평행)

edi-frontend/src/routes/AboutTopic.jsx:59
  └── noindex={lang === 'en'} 제거 (모든 영어 MDX 작성 후)

edi-frontend/src/routes/AboutIndex.jsx:33
  └── noindex={lang === 'en'} 제거 (모든 영어 MDX 작성 후)
```

### 4.3 분량 가이드

| 파일 | Korean 본문 길이 | English 목표 |
|---|---|---|
| society.mdx | ~2,200자 | 1,400~1,800 단어 |
| climate.mdx | ~2,300자 | 1,400~1,800 단어 |
| economy.mdx | ~2,800자 | 1,800~2,200 단어 |
| solar.mdx | ~2,400자 | 1,500~1,900 단어 |
| methodology.mdx | ~2,400자 | 1,500~1,900 단어 |
| en.about.indexLead | ~621자 (3문단) | 350~450 단어 (3문단) |

(Korean 자수 ≈ English 단어 비율 0.6~0.7)

## 5. Strict Skeleton (ko/en 1:1 고정 영역)

영어판이 한국어판과 **반드시 일치**해야 하는 항목.

### 5.1 H2 섹션 구조 (개수/순서/주제 동일)

| 페이지 | 섹션 (한국어 H2 → 영어 H2 톤 가이드) |
|---|---|
| **society** | 1. 이 지수란 무엇인가 / 2. 데이터 출처 (GDELT) / 3. 계산 방식 / 4. CAMEO 루트코드 가중치 |
| **climate** | 1. 이 지수란 무엇인가 / 2. 데이터 출처 (OpenWeather + 7개 도시) / 3. 점수 환산 방식 (도시당 0~6점) / 4. 임계값 |
| **economy** | 1. 이 지수란 무엇인가 / 2. 데이터 출처 (Yahoo Finance) / 3. 5종 stress 신호 / 4. 각 지표별 환산 |
| **solar** | 1. 이 지수란 무엇인가 / 2. 데이터 출처 (NOAA SWPC) / 3. 계산 방식 / 4. Kp 지수와 X급 플레어 |
| **methodology** | 1. DOOM-9000 산정 원리 / 2. 영역별 가중치와 정규화 / 3. 위험 등급 기준 / 4. 데이터 갱신 주기 |

H2 영어 제목 톤은 (A)에 맞게 약간의 hook 가미 OK. 예: "1. What this index actually measures" / "2. Where the data comes from".

### 5.2 숫자·임계값·표 (수정 금지)

- BREAKPOINTS, 가중치 (CAMEO 20:30 / 19:5 / 18:4 / 17:1 / 15:1 / 13:1 / 14:0.2)
- 6단계 위험 등급 임계값: 86 / 71 / 51 / 31 / 16
- 영역별 점수 범위: 사회·기후·경제 0~30, 태양 0~10
- 7개 도시: Seoul / New York / Mumbai / Tokyo / Sydney / Cairo / Moscow
- 임계 온도 30°C, −10°C
- VIX 30/40, S&P drawdown 임계, HYG drawdown 임계, yield curve 0/30/50/100/150/200bp
- Kp 분기점 4/9, X-ray flux M1/M5/X1 분기점

### 5.3 표 구조 (열 수/행 수 동일)

- society: CAMEO 가중치 표 (5행 2열)
- methodology: 위험 등급 표 (6행 3열) — DOOM/CRITICAL/DANGER/CAUTION/NOTICE/SAFE
- solar: Kp NOAA 등급 표 (7행 4열)

표 안 라벨은 i18n.js의 영어 dangerLevel 사용 (`OUTCOME IS CLEAR` / `BEYOND RECOVERY` / `NEAR CRITICAL` / `ACCELERATING` / `ANOMALY DETECTED` / `PEACEFUL ILLUSION`).

### 5.4 컴포넌트 임포트

```mdx
import TopicChart from '../../components/TopicChart.jsx'
import CrossLinks from '../../components/CrossLinks.jsx'
```

각 페이지 끝에 `<TopicChart kind="..." days={30} />` + `<CrossLinks current="..." lang="en" />` — 한국어판과 동일.

## 6. Free Prose 가이드라인

각 H2 섹션 **내부 산문**은 다음이 자유:

- 도입부 hook 문장 — 영어 native가 자연스럽게 읽히는 스타일
- 문단 개수 — 한국어 1문단을 영어 2문단으로 쪼개거나, 그 반대 가능
- 구체적 비유/예시 — 한국어판이 들지 않은 영어권 친화 비유 OK
- 연결어/접속사 — 직역 회피, 자연스러운 영어 흐름
- 인용 (1859 Carrington, WHO 폭염 가이드 등) — 사실은 동일, 표현은 자유

## 7. Tone Glossary

### 7.1 Danger 라벨 (i18n에서 확정 — 본문에서 그대로 사용)

| 한국어 | 영어 |
|---|---|
| 결과는 명백함 (DOOM) | OUTCOME IS CLEAR (DOOM) |
| 회복 불가 (CRITICAL) | BEYOND RECOVERY (CRITICAL) |
| 임계점 근접 (DANGER) | NEAR CRITICAL (DANGER) |
| 가속 중 (CAUTION) | ACCELERATING (CAUTION) |
| 이상 징후 감지 (NOTICE) | ANOMALY DETECTED (NOTICE) |
| 평온한 착각 (SAFE) | PEACEFUL ILLUSION (SAFE) |

### 7.2 사이트 시그니처 표현

| 한국어 | 영어 |
|---|---|
| DOOM-9000 | DOOM-9000 (그대로) |
| 오늘 지구는 얼마나 망했는가 | How doomed is Earth today? (i18n tagline에 이미 있음) |
| 결국 토이 프로젝트입니다 | This is, ultimately, a toy project. |
| 재미용 토이 프로젝트 | A toy project for fun |
| 점수의 일별 변동을 너무 진지하게 받아들이지 마세요 | Don't take the daily swings too seriously. |
| 평소의 고요함 — 다만 "착각" | The usual quiet — though "illusion" is the operative word. |
| 진지함과 자조 사이의 좁은 줄 위에 서 있는 지표 | An index walking the narrow line between earnest and self-deprecating. |

### 7.3 기술 용어 (영문 그대로)

`Kp index`, `geomagnetic storm`, `solar flare`, `VIX`, `S&P 500`, `HYG`, `yield curve`, `drawdown`, `CAMEO codes`, `GDELT`, `NOAA SWPC`, `OpenWeather`, `BREAKPOINTS`, `piecewise linear interpolation`, `coronal mass ejection (CME)`, `Carrington event`.

## 8. Korean-Specific 레퍼런스 처리

- **KST 시간 ("한국 시간 오전 9시 1분쯤")** → **UTC만 사용**. Korean reference 삭제. 본문에는 `UTC 00:01` 만 유지.
- **7개 도시** → 영어명 사용 (Seoul / New York / Mumbai / Tokyo / Sydney / Cairo / Moscow). 글로벌 도시라 OK.
- **한국적 self-deprecating 톤** → 영어 native equivalent (Section 7.2)로 치환. 문화적 손실 없음.

## 9. SEO 키워드 — Naturally 녹이기

(B) 톤 선택에 따라 키워드 스터핑은 안 함. 다만 본문 내에서 영어권 검색 키워드가 자연스럽게 등장:

- society: `protests`, `armed conflict`, `GDELT events`, `CAMEO codes`
- climate: `extreme weather`, `heat index`, `humidity`, `air quality index`, `WHO heat guidelines`
- economy: `recession risk`, `VIX volatility`, `market drawdown`, `yield curve inversion`, `high-yield spread`
- solar: `Kp index`, `geomagnetic storm`, `solar flare`, `coronal mass ejection`, `Carrington event`
- methodology: `composite index`, `risk tier`, `piecewise linear interpolation`, `domain weighting`

H2/H3에 키워드 포함 OK (자연스러운 헤더 표현일 때만).

## 10. 검증 & 마무리

### 10.1 noindex 메타 제거 (중요)

영어 about 페이지의 `noindex={lang === 'en'}` 는 두 곳에서 하드코딩:

```jsx
// AboutTopic.jsx:59
noindex={lang === 'en'}

// AboutIndex.jsx:33
noindex={lang === 'en'}
```

→ **모든 영어 MDX + indexLead 모두 작성된 후 한 번에 제거**. 빈 페이지인 채로 noindex만 풀면 thin content SEO 패널티 우려.

### 10.2 MDX 작성 시 주의사항

- **Frontmatter** — 한국어판처럼 YAML + `export const meta = {...}` 둘 다 작성. YAML은 SEO 빌드용, `meta` export는 `AboutTopic.jsx`의 `import.meta.glob` import용.
- **Bold/이탤릭 right-flanking 룰** — 영어는 CJK breaking 없어 `**bold**` 정상 작동. `<strong>` 우회 불필요.
- **Quotes** — smart quotes 대신 straight quotes 사용 (마크다운 안전).
- **Em-dash** — `—` (U+2014) 사용 가능하나 한국어판처럼 남발 금지. 영어는 자연스러운 punctuation 활용.
- **TopicChart / CrossLinks 임포트** — 한국어판과 동일 경로 (`'../../components/TopicChart.jsx'`).

### 10.3 빌드/SSG 검증

각 MDX 파일 작성 후:

```bash
npm run build  # SSG 5개 영어 페이지 생성 확인
npm run lint   # 린트 통과
```

`main.jsx`의 `TOPICS = ['society', 'climate', 'economy', 'solar', 'methodology']` + `LANGS = ['ko', 'en']` 가 SSG 자동 prerender. 추가 라우트 등록 불필요.

### 10.4 QA 체크리스트 (페이지별)

- [ ] H1 영어로 표시 (한국어 leakage 없음)
- [ ] Frontmatter가 본문에 노출되지 않음
- [ ] `**bold**`, `*italic*` 정상 렌더링
- [ ] 표 정렬 (한국어판과 동일 행/열 수)
- [ ] `<TopicChart>` 30일 데이터 렌더링
- [ ] `<CrossLinks current="..." lang="en" />` — 영어 토픽 라벨로 연결
- [ ] PageHead title/description이 영어 (meta export 확인)
- [ ] Breadcrumb 영어 (`Home > About > Society Threat Index`)
- [ ] 모든 i18n 라벨 영어 (한국어 fallback 없음)

## 11. 작업 순서 (커밋 단위)

1. **Commit 1**: `i18n.js` `en.about.indexLead` 3문단 확장
2. **Commit 2~6**: 영어 MDX 페이지당 1커밋 (society → climate → economy → solar → methodology 순서)
3. **Commit 7**: `AboutTopic.jsx` + `AboutIndex.jsx`의 `noindex={lang === 'en'}` 제거
4. **Commit 8** (선택): sitemap 영어 URL 우선순위 조정 (필요시)

각 커밋 후 `npm run build` + `npm run lint` 체크. PR은 Phase 2 PR과 같은 패턴으로 base = `feature/explainer-pages-phase2` 위에 stack.

## 12. 향후 단계 (Phase 4+)

- **다국어 추가** (일본어, 중국어 등) — 별도 spec.
- **콘텐츠 자동 sync 메커니즘** — 한국어 본문 업데이트 시 영어판도 함께 갱신해야 한다는 신호 (CI 체크 또는 수동 체크리스트). Phase 3 이후 운영하면서 결정.
- **i18n.js 분리** — 본문이 계속 길어지면 `i18n/ko.js` / `i18n/en.js` 분리 고려.
