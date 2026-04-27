# Explainer 페이지 시스템 (Phase 2: 한국어 콘텐츠 + TopicChart 실 구현)

## 배경

[Phase 1](./2026-04-26-explainer-pages-design.md)에서 `/ko/about/{topic}` 5개 + `/en/about/{topic}` 5개 + `/{lang}/about` 2개 = 총 12개 about 페이지의 라우팅·SSG·SEO 인프라가 구축되었다. 단, 본문은 placeholder("준비 중" 200~300자)이고 `<TopicChart>`는 안내 박스만 표시하는 placeholder 컴포넌트다.

Phase 2는 인프라가 완성된 그릇 위에 **실 콘텐츠와 실 차트를 채워 한국어 SEO 토픽 클러스터를 가동**한다. 영어 본문은 Phase 3로 분리한다.

## 목표

1. `/ko/about/{topic}` 4개 + `/ko/about/methodology` + `/ko/about` 인덱스 lead 문단 = 6개 위치에 실 콘텐츠 배치 (각 1,500~3,000자 또는 500~800자).
2. `<TopicChart kind days />`를 placeholder에서 실 차트로 교체. 클라이언트가 `/api/doom-history`에서 30일 데이터 fetch, 해당 지표 1개 라인 렌더.
3. AboutCard 호버/포커스 인터랙션 강화 + 모바일 레이아웃 개선.
4. 영어 about 페이지 (placeholder 상태)에 `<meta name="robots" content="noindex, follow">` 추가하여 thin content 인덱싱 방지. Phase 3에서 본문 작성 후 제거.

## 비목표 (Phase 2 명시적 제외)

- **영어 본문 작성** — Phase 3로 분리.
- **페이지별 동적 OG 이미지** — `api/og.js`의 메인 OG 이미지가 모든 페이지에 공통 사용 중이며 충분.
- **AI 코멘터리 자동 링크 처리** — 별도 spec.
- **`/data/download` 페이지 + Dataset JSON-LD** — 별도 spec.
- **Search Console 등록** — 이미 처리됨.
- **6주 모니터링 결과 기반 추가 튜닝** — Phase 4 후보.
- **자동 테스트 도입** — 프로젝트 테스트 셋업 없음, Phase 1 정책 유지.
- **카드 미니 통계 표시** (현재 점수, 트렌드 화살표 등) — Phase 1에서도 비목표였고 동일 유지.

## 의존성 변경

없음. Phase 1에서 추가된 패키지(`react-router-dom`, `@mdx-js/rollup`, `@mdx-js/react`, `vite-react-ssg`, `gray-matter`, `recharts`)를 그대로 사용.

## 콘텐츠 작성 계획

### 분량 가이드

| 페이지 | 본문 분량 | 비고 |
|---|---|---|
| society / climate / economy / solar | 각 1,500~2,500자 | 토픽 페이지 4개 |
| methodology | 2,000~3,000자 | 종합 산정식 + 가중치 |
| about 인덱스 lead 문단 | 500~800자 | 카드 위 안내 |

### 토픽 페이지 H2 구조 (하이브리드: 공통 4 + 토픽 특화 1)

```
H1: "{지수명}이란?"
├─ 한 줄 요약 (200자 내외, 검색 결과 스니펫용 — H2 헤딩 없이 lead 문단)
├─ H2: 1. 이 지수란 무엇인가
├─ H2: 2. 데이터 출처
├─ H2: 3. 계산 방식
├─ H2: 4. [토픽 특화 — 아래 표]
├─ H2: 5. 한계와 주의
├─ <TopicChart kind="..." days={30} />
└─ <CrossLinks current="..." lang="ko" />
```

| 토픽 | 특화 H2 제목 | 다룰 내용 |
|---|---|---|
| society | CAMEO 코드 분류와 가중치 | CAMEO 카테고리 (시위/충돌/협력 등), 코드별 가중치 산정, NumMentions 정규화 |
| climate | 이상 기상 임계값 | 폭염·한파·강풍·강수 임계 정의, 도시 표본, 일일 누적 |
| economy | 5종 위협 신호 해부 | 최근 도입된 5-signal stress 모델 (VIX, 달러 인덱스, 채권 스프레드, 원자재, 증시 모멘텀) |
| solar | Kp 지수와 X-class 플레어 등급 | NOAA SWPC 데이터 출처, Kp 값별 지자기 폭풍 단계, X-class 플레어 분류 |

### methodology 페이지 H2 구조

```
H1: 종합 산정 방법론
├─ 한 줄 요약 (200자 내외)
├─ H2: 1. DOOM-9000 산정 원리 (4개 지수 합산)
├─ H2: 2. 영역별 가중치와 정규화
├─ H2: 3. 위험 등급 기준 (DOOM/CRITICAL/DANGER/CAUTION/NOTICE/SAFE)
├─ H2: 4. 데이터 갱신 주기와 시점 (UTC 기준 일일 크론)
├─ H2: 5. 재현 가능성과 한계
└─ <CrossLinks current="methodology" lang="ko" />
```

### about 인덱스 lead 문단

`/ko/about` 상단의 카드 위 안내문. 500~800자.

내용 골자:
- Earth Doom Index가 어떤 4개 영역을 측정하는지
- 왜 이런 지표를 만들었는지 (토이 프로젝트의 정체성)
- 각 영역별 카드를 클릭하면 무엇을 볼 수 있는지

### 작성 톤

- 정보·SEO 중심의 객관적 어조 (메인 페이지의 자조적 유머는 줄임).
- 각 페이지 도입 1문단(약 200자)에는 톤을 살려 사용자 보이스 유지 — 단조로운 위키 글로 보이지 않게.
- 키워드 자연 배치: 토픽별 공식 용어(GDELT, CAMEO, OpenWeather, Yahoo Finance, NOAA SWPC)와 한국어 검색어("사회 갈등 지수", "기후 위협", "경제 위기 신호", "태양 폭풍" 등)를 첫 H2 안에 1회 이상.

### 작성·검토 흐름

1. 페이지 1개씩 — H2 outline → 본문 초안 → 사용자 검토 → 필요 시 수정 → MDX(또는 i18n) 파일 commit.
2. 한 페이지가 끝나야 다음 시작 (병렬 X). 작성 순서: society → climate → economy → solar → methodology → about 인덱스 lead.
3. MDX 파일 위치: 기존 `src/content/ko/{topic}.mdx` 5개를 본문 교체 (Phase 1 placeholder → 실 본문). about 인덱스 lead는 MDX가 아니라 `src/i18n.js`의 `about.indexLead` 키 확장.
4. MDX frontmatter는 그대로 유지하되 description은 본문 lead 문단을 반영하도록 갱신. `export const meta` 블록의 description도 동일하게 갱신.

## TopicChart 실 구현

### 인터페이스 (변경 없음)

```jsx
<TopicChart kind="society" days={30} />
```

- `kind: 'society' | 'climate' | 'economy' | 'solar'`
- `days: 7 | 30` (기본 30)

### 데이터 흐름

1. 마운트 시 `useEffect`로 `${import.meta.env.VITE_API_URL ?? ''}/api/doom-history?days=${days}` GET.
2. 응답 배열에서 `target_date` + `${kind}_score` 두 필드만 사용.
3. 상태 머신:
   - `loading` → "차트 데이터 불러오는 중..."
   - `error` → "차트를 불러올 수 없습니다." + nes-btn 재시도 버튼
   - `ready` → recharts LineChart 렌더
4. SSG 빌드 시엔 `useEffect`가 실행되지 않으므로 prerender HTML엔 loading 상태 박스만 박힘 (의도, SEO에 무해 — 차트는 보조 자료).

### 시각 디자인

- recharts `LineChart`. 높이 200~220px (메인 DoomChart 260보다 작게).
- 단일 라인. 색상은 토픽별 고유 색 사용 (DoomChart breakdown 모드와 동일):
  - society = `#92cc41`
  - climate = `#209cee`
  - economy = `#f7d51d`
  - solar = `#ff6b6b`
- ReferenceLine 2개로 max/min 표시 (DoomChart 패턴 재사용).
- X축 포맷: `M/D` (DoomChart의 `formatDate`와 동일).
- 7D/30D 토글 버튼은 두지 않음 — 임베드 차트 단순함 유지. days prop이 결정.
- 하단 캡션 1줄: "출처: GDELT / OpenWeather / Yahoo Finance / NOAA SWPC" 중 토픽에 맞는 것.
- nes-container is-dark 래핑.

### 코드 중복 정책

- `formatDate`, `RetroTooltip` 같은 헬퍼는 DoomChart에서 추출하지 않고 TopicChart 내부에 복제.
- 이유: 두 컴포넌트의 역할이 분리됨 (메인용 풍부한 차트 vs about용 단순 차트). 추후 third 차트가 필요해지면 그때 추출.

### 파일 영향

- `src/components/TopicChart.jsx` — placeholder 코드 전체 교체.
- `src/App.css` — `.topic-chart-section`, `.topic-chart-loading`, `.topic-chart-error` 등 스타일 추가.

## AboutCard polish

### 호버/인터랙션

1. **클릭 영역 명시**: `cursor: pointer`. 키보드 접근성 위해 `<a>` 그대로 사용 (이미 anchor라 충분).
2. **호버 강조**: `box-shadow: 4px 4px 0 #e76e55` + `transform: translate(-2px, -2px)`. transition 0.1s.
3. **포커스 링**: `:focus-visible`에 호버와 동일 강조.
4. **CTA 화살표 슬라이드**: 호버 시 `→`가 우측으로 4px 이동 (translateX).

### 모바일 (≤640px)

1. 단일 컬럼 유지. 카드 padding 축소: `32px 24px` → `20px 16px`.
2. CTA 라인("자세히 알아보기 →")은 숨김. 대신 카드 우측 상단에 chevron `›` 표시 (시각적 affordance).
3. methodology 카드는 데스크탑에선 별도 영역, 모바일에선 일반 카드와 같은 흐름의 5번째 카드로 배치 (구분선 1개 위에 두어 구분 유지).

### 범위 외

- 카드 내 미니 통계 표시 (현재 점수, 트렌드 화살표 등)
- 카드 색 테마 변경 (nes.css 톤 그대로)

### 파일 영향

- `src/components/AboutCard.jsx` — chevron span 추가, 모바일 hidden CTA 처리.
- `src/App.css` — `.about-card` 호버/포커스/모바일 미디어쿼리 추가.

## 영어 placeholder noindex 처리

### 문제

Search Console이 이미 등록되어 있고 sitemap도 영어 about URL을 포함한 상태. 이 상태로 두면 placeholder 영어 본문(200~300자)이 thin content로 인덱싱되어 사이트 전체 도메인 권위에 마이너스 가능.

### 해결

영어 about 페이지에만 `<meta name="robots" content="noindex, follow">` 추가. Phase 3에서 영어 본문 작성 후 이 meta를 제거하면 자연 인덱싱.

`follow`로 두는 이유: 페이지 자체는 인덱싱 막되, 페이지에서 나가는 내부 링크(메인 페이지 등)의 권위 전달은 막지 않음.

### 적용 범위

- ✅ `/en/about` (인덱스)
- ✅ `/en/about/society|climate|economy|solar|methodology` (5개)
- ❌ `/en` (메인 — 점수·차트·코멘터리 모두 영어로 표기되어 thin이 아님, 인덱싱 유지)

### 구현

- `src/seo/PageHead.jsx` props에 `noindex?: boolean` 추가. true면 `<meta name="robots" content="noindex, follow">` 렌더, 그 외 미렌더.
- `src/routes/AboutTopic.jsx` + `src/routes/AboutIndex.jsx`에서 `lang === 'en'`이면 `noindex={true}` 전달.

### sitemap 처리

영어 about URL은 sitemap에 그대로 둠. sitemap 등재 URL이라도 페이지 meta가 noindex면 검색엔진이 인덱싱하지 않음. Phase 3에서 noindex 제거하면 자연 발견.

## 파일 영향 정리

```
edi-frontend/
├── src/
│   ├── content/ko/
│   │   ├── society.mdx          (수정 — 본문 교체)
│   │   ├── climate.mdx          (수정 — 본문 교체)
│   │   ├── economy.mdx          (수정 — 본문 교체)
│   │   ├── solar.mdx            (수정 — 본문 교체)
│   │   └── methodology.mdx      (수정 — 본문 교체)
│   ├── components/
│   │   ├── TopicChart.jsx       (수정 — placeholder → 실 구현)
│   │   └── AboutCard.jsx        (수정 — chevron, 모바일 처리)
│   ├── routes/
│   │   ├── AboutIndex.jsx       (수정 — lead 본문 i18n 키 갱신, en이면 noindex)
│   │   └── AboutTopic.jsx       (수정 — en이면 noindex)
│   ├── seo/
│   │   └── PageHead.jsx         (수정 — noindex prop)
│   ├── i18n.js                  (수정 — about.indexLead 본문 확장)
│   └── App.css                  (수정 — TopicChart, AboutCard 스타일 추가)
```

미수정:
- `vercel.json`, `index.html`, `sitemap.xml`, `main.jsx`, 백엔드 코드 일체.

## 테스트 & 검증

### 빌드 검증

1. `npm run build` 성공, 15개 정적 HTML 생성 (Phase 1 결과와 동일 수치).
2. `dist/ko/about/{topic}.html`을 grep으로 본문 첫 H2 텍스트 포함 확인 → prerender 정상.
3. `dist/en/about/{topic}.html`에 `<meta name="robots" content="noindex, follow">` 포함 확인.
4. `dist/ko/about/{topic}.html`엔 `noindex`가 **없는지** 확인 (음성 검증).
5. `dist/en/index.html` (즉 `/en` 메인)엔 noindex가 **없는지** 확인.

### 런타임 수동 검증

1. `npm run dev` (프로덕션 API 연결).
2. `/ko/about/society` 진입 → 본문이 placeholder가 아닌 실제 1,500자+ 콘텐츠인지.
3. 같은 페이지에서 `<TopicChart>`가 약 1초 안에 차트 렌더, 30일치 라인 표시.
4. DevTools 네트워크 탭에서 `/api/doom-history?days=30` 200 응답 확인.
5. `<TopicChart>` 에러 시뮬레이션: dev 환경 변수 임시 변경 → "차트를 불러올 수 없습니다." + 재시도 버튼 동작.
6. `/ko/about` 카드 호버 시 box-shadow + translate 효과, focus-visible 키보드 탭 시 동일 효과.
7. 모바일 뷰포트 (375px) 토글 → 카드 padding 축소, CTA 라인 사라지고 chevron 표시.
8. 5개 토픽 페이지 + methodology + about 인덱스 모두 직접 진입해 본문·차트·링크 동작 확인.

### lint

`npm run lint` 통과.

### 비검증

- `view-source:` Googlebot 시뮬레이션 — Phase 1에서 검증 완료. Phase 2는 콘텐츠만 바뀌므로 불필요.
- Lighthouse SEO 점수 — 후속 운영 task.
- 자동 테스트 — 프로젝트 테스트 셋업 없음.

## 후속 단계 (참고)

- **Phase 3 (영어 콘텐츠)** — 별도 spec. 한국어 콘텐츠를 기반으로 영어권 키워드 의도에 맞게 재작성. 완료 시 영어 페이지 noindex 제거.
- **Phase 4 (모니터링 기반 튜닝, 가칭)** — Search Console 6주 데이터 분석 후 클릭률·노출이 낮은 페이지의 메타·H1·콘텐츠 부분 개선.
