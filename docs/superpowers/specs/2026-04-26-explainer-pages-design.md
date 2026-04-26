# Explainer 페이지 시스템 (Phase 1: 인프라 + 골격)

## 배경

현재 `edi-frontend`는 단일 SPA로 메인 페이지 하나(`/`)만 존재한다. 4개 위협 지수(society/climate/economy/solar) 설명은 카드 모달의 짧은 텍스트(2~3문장)뿐이다.

장기 검색 트래픽 확보를 목적으로 하는 SEO 정비 기획에서, **에버그린 토픽 클러스터 페이지** 도입이 핵심 레버로 식별되었다. 일일 점수는 뉴스성 콘텐츠라 트래픽이 불안정하므로, 검색 유입의 안정적인 토대는 "GDELT란?", "사회 갈등 지수 측정" 같은 정보성 키워드를 타겟하는 설명 페이지에서 나온다.

이번 작업은 그 시스템의 **Phase 1**: 라우팅·렌더링·SEO 메커니즘 등 **인프라와 골격**을 완성한다. 본격 콘텐츠 작성은 Phase 2(한국어), Phase 3(영어)로 분리한다.

## 목표

- `/ko/about/{topic}`, `/en/about/{topic}` 라우트 구조가 정적 HTML로 prerender되어, Googlebot이 JS 렌더링 없이 즉시 인덱싱 가능하다.
- 메인 페이지 URL이 언어별로 분리(`/ko`, `/en`)되어 hreflang이 정상 작동한다.
- 신규 페이지로 진입하는 모든 링크 경로(상단 네비, 카드 모달, 푸터, 메인 explainer 섹션)가 연결되어 있다.
- MDX 기반 콘텐츠 작성 환경이 갖춰져 Phase 2/3에서 콘텐츠만 추가하면 된다.
- 기존 메인 페이지 사용자 경험은 깨지지 않는다 (북마크된 `/`도 정상 작동).

## 비목표 (Phase 1 명시적 제외)

- **본격 한국어/영어 콘텐츠 작성** — Phase 2/3. 이번 단계의 MDX 파일은 placeholder("준비 중" 안내 + 200~300자 임시 텍스트)로만 채운다.
- **`<TopicChart />` 실제 구현** — placeholder div만 둔다. Phase 2에서 실 차트 임베드.
- **`/data/download` 페이지 + Dataset JSON-LD 스키마** — 향후 별도 spec.
- **날짜별 페이지 (`/YYYY-MM-DD`)** — 영구 비목표. 검색 트래픽 ROI 낮음, thin content 위험.
- **sitemap 자동 갱신 인프라** — 영구 비목표. 추가 페이지가 정적이라 수동 관리로 충분.
- **AI 코멘터리 자동 링크 처리** — 향후 별도 spec.
- **OG 이미지 페이지별 동적 생성** — Phase 2 이후 검토. 일단 메인의 기존 OG 이미지 공통 사용.
- **자동 테스트 도입** — 현재 프로젝트에 테스트 셋업 없음. Phase 1 범위에서 신규 도입은 오버엔지니어링.

## 의존성 변경

**추가**:
- `react-router-dom` — 클라이언트 라우팅
- `@mdx-js/rollup` + `@mdx-js/react` — MDX 콘텐츠 파싱·렌더
- **Vite + React Router 호환 SSG 도구** (예: `vite-react-ssg`) — 정확한 라이브러리는 plan 단계 PoC 후 확정

**유지**:
- React 19, Vite 8, nes.css, recharts — 그대로
- Vercel 정적 호스팅
- 백엔드 API (`/api/today-doom`, `/api/doom-history`) — 변경 없음

## 라우트 구조

| URL | 콘텐츠 | 비고 |
|---|---|---|
| `/` | 정적 "Choose language" 페이지 | Googlebot이 양 언어 발견 가능, 사용자는 클라이언트에서 즉시 리다이렉트 |
| `/ko` | 한국어 메인 | 기존 `App.jsx` 래핑 |
| `/en` | 영어 메인 | 기존 `App.jsx` 래핑 |
| `/ko/about` | 한국어 허브 (4개 지수 카드 + methodology 카드) | 신규 |
| `/ko/about/society` | 사회 위협 지수 설명 (placeholder) | 신규 |
| `/ko/about/climate` | 기후 위협 지수 설명 (placeholder) | 신규 |
| `/ko/about/economy` | 경제 위협 지수 설명 (placeholder) | 신규 |
| `/ko/about/solar` | 태양 위협 지수 설명 (placeholder) | 신규 |
| `/ko/about/methodology` | 종합 산정 방법론 (placeholder) | 신규 |
| `/en/about` | 영어 허브 | 신규 (Phase 1에서 골격만, Phase 3에서 콘텐츠) |
| `/en/about/{topic}` | 5종 (placeholder) | 신규 |

총 **15개 정적 HTML** 빌드 대상 (`/` 포함).

### URL 규칙

- 트레일링 슬래시 없음 (`/ko/about/society` ✅)
- 소문자 케밥 케이스
- `/about` 단일 경로(언어 prefix 없음)는 `/ko/about` 또는 `/en/about`로 클라이언트 리다이렉트

### 언어 감지 & 리다이렉트

- `/`로 진입 시 클라이언트 사이드:
  1. localStorage `edi-lang` 확인 → 있으면 해당 언어로 push
  2. 없으면 `navigator.language.startsWith('ko')` 확인
  3. 한국어면 `/ko`, 아니면 `/en`로 push
- 검색 봇 대응: `/`도 정적 HTML로 prerender. 본문에 양 언어 메인 페이지 링크 + meta refresh 또는 noscript fallback 포함하여 봇이 양쪽을 발견할 수 있게 함.

### 언어 토글 동작 변경

- 현재: 같은 URL에서 텍스트만 전환
- 변경 후: URL 자체가 전환 (`/ko/about/society` ↔ `/en/about/society`)
- localStorage `edi-lang`은 계속 유지 (재진입 시 우선)

## 파일 구조

```
edi-frontend/src/
├── main.jsx                    # 라우터 마운트 (변경)
├── App.jsx                     # 기존 메인 — props로 lang 받도록 수정
├── DoomChart.jsx               # 기존, 변경 없음
├── i18n.js                     # 기존 + about/* 키 추가
├── routes/                     # 신규
│   ├── Home.jsx                # /ko, /en — App.jsx 래퍼
│   ├── LangPicker.jsx          # / — 정적 언어 선택 페이지
│   ├── AboutLayout.jsx         # /{lang}/about/* 공통 레이아웃
│   ├── AboutIndex.jsx          # /{lang}/about — 허브 페이지
│   └── AboutTopic.jsx          # /{lang}/about/:topic — MDX 렌더 템플릿
├── content/                    # 신규 (placeholder)
│   ├── ko/
│   │   ├── society.mdx
│   │   ├── climate.mdx
│   │   ├── economy.mdx
│   │   ├── solar.mdx
│   │   └── methodology.mdx
│   └── en/
│       └── (Phase 3에서 작성, Phase 1에선 ko로 fallback 또는 동일 placeholder 사용)
├── components/                 # 신규
│   ├── TopNav.jsx              # App.jsx에서 분리, /about 메뉴 추가
│   ├── Footer.jsx              # App.jsx에서 분리, /about 링크 추가
│   ├── AboutCard.jsx           # 허브 페이지의 토픽 카드
│   ├── TopicChart.jsx          # MDX 임베드용 placeholder div (Phase 2에서 실 구현)
│   └── CrossLinks.jsx          # 페이지 하단 "관련 토픽" 블록
└── seo/                        # 신규
    ├── PageHead.jsx            # title/description/canonical/hreflang 주입
    └── jsonLd.js               # Article, BreadcrumbList 빌더
```

### MDX 파일 구조 (placeholder 예시)

```mdx
---
title: "사회 위협 지수란? — GDELT 기반 글로벌 갈등 측정"
description: "Earth Doom Index의 사회 위협 지수가 무엇이고 어떻게 계산되는지 설명합니다."
keywords: ["GDELT", "CAMEO 코드", "사회 갈등 지수", "지정학 위험"]
publishedAt: "2026-04-26"
---

# 사회 위협 지수란?

본 페이지는 준비 중입니다. 이 지수는 GDELT 뉴스 이벤트 데이터를
기반으로 전 세계 시위·분쟁·무력 충돌의 빈도와 강도를 0~30점으로
환산한 지표입니다.

(Phase 2에서 1,500~2,500자 본문으로 확장 예정)

<TopicChart kind="society" days={30} />

<CrossLinks current="society" lang="ko" />
```

### MDX 렌더링 흐름

1. Vite + `@mdx-js/rollup`이 `.mdx`를 React 컴포넌트로 컴파일
2. `AboutTopic.jsx`가 라우트 파라미터(`:topic`)와 현재 언어에 따라 동적 import
3. frontmatter는 별도 export로 추출 → `PageHead.jsx`에 전달
4. `<TopicChart />`, `<CrossLinks />` 같은 React 컴포넌트는 MDX 안에서 자유롭게 사용

## 빌드 흐름

```
vite build
  → SSG 도구가 15개 라우트를 헤드리스 환경에서 렌더
  → 각 라우트별 정적 HTML 파일을 dist/에 생성
  → 각 HTML은 prerendered 본문 + React 하이드레이션 스크립트 포함
  → Vercel 배포 시 정적 서빙
```

### Vercel 설정 변경

기존 `vercel.json`:
```json
{ "rewrites": [{ "source": "/((?!api/).*)", "destination": "/" }] }
```

변경 후: 정적 파일 우선 서빙, 매칭 안 되는 경로만 `/index.html` fallback. 정확한 형태는 plan 단계에서 확정 (SSG 도구의 출력 구조에 따라 달라짐).

## UI 변경 사항

### 메인 페이지 (`/ko`, `/en`)

1. **TopNav 확장**
   ```
   [EARTH DOOM INDEX]    [지표 설명 ▾] [방법론]    [KO/EN]
   ```
   - "지표 설명" 호버 드롭다운: 4개 지수 + about 인덱스 진입
   - "방법론" 직접 링크: `/{lang}/about/methodology`
   - 모바일은 햄버거 메뉴 (nes.css 버튼 활용, 가벼운 구현)
   - **데이터 메뉴는 Phase 1 제외**

2. **점수 카드 모달에 "더 알아보기" 버튼 추가**
   - 기존 모달 콘텐츠 하단에 `<a class="nes-btn">자세히 알아보기 →</a>` 추가
   - `/{lang}/about/{topic}`로 이동

3. **Explainer 섹션 신규** — 차트와 푸터 사이 위치
   ```
   ┌──────────────────────────────────────┐
   │  이 점수는 어떻게 계산되나요?            │
   │  DOOM-9000은 4개 영역의 위협을 종합:    │
   │  [🏙 사회 →] [🌡 기후 →]              │
   │  [📈 경제 →] [☀ 태양 →]              │
   │  [ 전체 산정 방법론 자세히 보기 → ]      │
   └──────────────────────────────────────┘
   ```

4. **Footer 확장**
   ```
   GITHUB | 사회 | 기후 | 경제 | 태양 | 방법론 | © 2026 ... | 약관 | 문의
   ```

### `/{lang}/about` 허브 페이지

- 4개 지수 카드 (메인 페이지 카드 디자인 재사용)
- methodology 카드 별도 (시각적으로 구분)
- 각 카드 클릭 시 토픽 페이지로 이동
- 페이지 상단 짧은 안내문 (500~800자, Phase 2에서 본문 확장)

### `/{lang}/about/{topic}` 페이지

```
[ TopNav (재사용) ]
[ Breadcrumb: 홈 > 지표 설명 > 사회 위협 지수 ]
[ MDX 콘텐츠 본문 ]
  - h1, h2, h3, p, ul, code 등 nes.css 톤에 맞춰 스타일링
  - 본문 중간에 <TopicChart /> 임베드
  - 본문 끝에 <CrossLinks /> 임베드
[ Footer (재사용) ]
```

### App.jsx 리팩토링

`TopNav`, `Footer`, `ShareButtons` 등을 `components/`로 분리. 이는 `/about/*` 페이지에서도 재사용해야 하므로 **불가피한 분리**. 부수효과로 `App.jsx`(현재 ~660줄)이 ~400줄대로 축소되어 가독성 개선.

분리 대상:
- `TopNav` → `components/TopNav.jsx` (메뉴 항목 추가됨)
- `Footer` (현 `<footer>` 영역) → `components/Footer.jsx` (about 링크 추가됨)
- `ShareButtons` → `components/ShareButtons.jsx` (변경 없이 이동만)

`VoteSection`, `useVote`, `useDoomData` 등 메인 페이지 전용 로직은 `App.jsx`에 남는다.

## SEO 메커니즘

### PageHead.jsx

페이지마다 다음 태그를 동적으로 주입:

- `<title>` — MDX frontmatter 또는 라우트 정의에서
- `<meta name="description">` — 동상
- `<link rel="canonical" href="{absoluteSelf}">`
- `<link rel="alternate" hreflang="ko" href="{koEquivalent}">`
- `<link rel="alternate" hreflang="en" href="{enEquivalent}">`
- `<link rel="alternate" hreflang="x-default" href="{enEquivalent}">`
- OG/Twitter 태그 (제목·설명만 페이지별, OG 이미지는 기존 공통 `/api/og`)

Phase 1에서 영어 콘텐츠가 placeholder인 경우에도 영어 라우트는 존재하므로 hreflang은 정상 페어링한다. (Phase 3에서 본문만 채워지면 자연스럽게 완성)

### JSON-LD (jsonLd.js)

- **Article** — 모든 about 토픽 페이지 (headline, datePublished, author, publisher)
- **BreadcrumbList** — 모든 about 페이지 (홈 > 지표 설명 > 토픽)
- **Organization** — 모든 페이지 공통
- **Dataset** — Phase 1 제외 (`/data` 페이지 만들 때 도입)

### sitemap.xml 갱신

수동 갱신:
- **기존 `/` 항목은 제거** — `/`는 리다이렉트 페이지라 sitemap에 포함하지 않는다. canonical은 `/ko`, `/en`이 갖는다.
- 신규 14개 URL 추가:
  - 메인 2개: `/ko`, `/en` — `<changefreq>daily</changefreq>`, `<priority>1.0</priority>`
  - about 12개 (`/{lang}/about` 2 + `/{lang}/about/{topic}` 10): `<changefreq>monthly</changefreq>`, `<priority>0.8</priority>`

### robots.txt

변경 없음 (이미 `Allow: /` + Sitemap 지정 상태).

### 부수 효과

기존 `index.html`의 hreflang은 `/`를 양쪽 언어가 공통으로 가리키고 있어 사실상 무효였다. SSG 결과로 각 페이지가 자기만의 PageHead를 갖게 되면서 자연스럽게 정정된다.

## 콘텐츠 분량 가이드 (Phase 1 placeholder, Phase 2 본문 기준)

| 페이지 | Phase 1 placeholder | Phase 2 본문 |
|---|---|---|
| 토픽 4개 | 200~300자 안내 | 1,500~2,500자 |
| methodology | 200~300자 안내 | 2,000~3,000자 |
| about 인덱스 | 100~200자 + 카드 | 500~800자 + 카드 |

## 테스트 & 검증

- **빌드 검증**: `vite build` 결과 `dist/` 폴더에 14개 HTML 파일이 각자의 경로로 생성됨, 각 HTML 본문에 prerendered 콘텐츠가 포함됨 (수동 grep 확인).
- **링크 검증**: 빌드된 HTML 내 모든 내부 링크가 깨지지 않음을 확인하는 가벼운 스크립트 (가능하면 plan 단계에 추가).
- **lint**: 기존 ESLint 규칙 통과.
- **수동 시나리오**:
  1. `/`로 접속 시 브라우저 언어에 맞춰 `/ko` 또는 `/en`로 이동.
  2. `/ko` 메인에서 점수 카드 클릭 → 모달의 "자세히 알아보기" → `/ko/about/society` 이동.
  3. `/ko/about/society`에서 언어 토글 → `/en/about/society`로 URL 전환.
  4. JS 비활성화 상태로 `/ko/about/society` 접속 시 본문(placeholder)이 보임 — prerender 정상 동작 검증.
  5. `view-source:` 또는 curl로 본문이 HTML에 박혀 있음 확인 (Googlebot 시뮬레이션).
  6. 메인 페이지의 explainer 섹션·TopNav 메뉴·푸터 링크가 모두 정상 동작.
- **자동 테스트 도입 안 함** — 현재 프로젝트에 테스트 셋업 없음, Phase 1 범위에서 도입은 오버엔지니어링.

## 후속 단계 (참고)

이번 spec/plan은 Phase 1만 다룬다. 후속:

- **Phase 2 (한국어 콘텐츠)** — 별도 spec. 6개 페이지 본문 작성, `<TopicChart />` 실 구현, Search Console 등록 후 6주 모니터링.
- **Phase 3 (영어 콘텐츠)** — 별도 spec. 한국어 콘텐츠 영어 번역·현지화 (그대로 번역이 아니라 영어권 키워드 의도 반영).
