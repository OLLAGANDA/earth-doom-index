# Explainer Pages Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 1에서 인프라가 완성된 about 페이지에 한국어 실 콘텐츠(5개 MDX + 1개 i18n key) + 실 TopicChart + AboutCard 인터랙션 polish + 영어 placeholder noindex 처리를 채워 넣는다.

**Architecture:** 정적 인프라는 그대로 유지(SSG, MDX, react-router). Placeholder TopicChart를 클라이언트 fetch + recharts LineChart로 교체. AboutCard에 hover/focus 시각 강조와 모바일 미디어쿼리 추가. PageHead에 noindex prop 추가하여 /en/about/* 6개 라우트에 thin content 인덱싱 방지. 5개 MDX 파일 본문 교체와 i18n.js의 about.indexLead 확장으로 한국어 콘텐츠 작성.

**Tech Stack:** React 19, Vite 7, vite-react-ssg, @mdx-js/rollup, @mdx-js/react, recharts, react-router-dom v6 (모두 Phase 1에서 도입됨, 추가 패키지 없음).

**Spec:** `docs/superpowers/specs/2026-04-27-explainer-pages-phase2-design.md`

**Branch:** `feature/explainer-pages-phase2`. Phase 1 PR(`feature/explainer-pages-phase1`) merge 완료 시 main에서, 미완료 시 `feature/explainer-pages-phase1`에서 branch off.

---

## File Structure

```
edi-frontend/
├── src/
│   ├── content/ko/                 (5개 MDX 본문 교체)
│   │   ├── society.mdx
│   │   ├── climate.mdx
│   │   ├── economy.mdx
│   │   ├── solar.mdx
│   │   └── methodology.mdx
│   ├── components/
│   │   ├── TopicChart.jsx          (전체 교체: placeholder → 실 차트)
│   │   └── AboutCard.jsx           (chevron, 모바일 처리)
│   ├── routes/
│   │   ├── AboutIndex.jsx          (lang === 'en'이면 noindex prop)
│   │   └── AboutTopic.jsx          (lang === 'en'이면 noindex prop)
│   ├── seo/
│   │   └── PageHead.jsx            (noindex prop 추가)
│   ├── i18n.js                     (about.indexLead ko만 확장)
│   └── App.css                     (.about-card, .about-index, .topic-chart-* 스타일 추가)
```

미수정: `vercel.json`, `index.html`, `public/sitemap.xml`, `main.jsx`, 백엔드 일체.

---

## Task 1: Branch 셋업

**Files:** 없음 (git 작업만).

- [ ] **Step 1: 베이스 결정**

  현재 git 상태에 따라 어디서 분기할지 결정.

  ```bash
  git fetch origin
  git log origin/main --oneline -3
  git log origin/feature/explainer-pages-phase1 --oneline -3 2>/dev/null || true
  ```

  - 만약 Phase 1 PR이 main에 merged → `git checkout main && git pull`
  - 미 merged → `git checkout feature/explainer-pages-phase1 && git pull`

- [ ] **Step 2: Phase 2 branch 생성**

  ```bash
  git checkout -b feature/explainer-pages-phase2
  git status
  ```
  Expected: clean working tree, 새 branch에 위치.

- [ ] **Step 3: Plan 파일 본 branch에 복사 (참조용)**

  ```bash
  ls docs/superpowers/plans/2026-04-27-explainer-pages-phase2.md
  ```
  Expected: 파일 존재 (main에서 따라옴).

---

## Task 2: PageHead `noindex` prop 추가

**Files:**
- Modify: `edi-frontend/src/seo/PageHead.jsx`

- [ ] **Step 1: PageHead.jsx에 noindex prop과 처리 로직 추가**

  파일을 다음으로 교체. 변경점은 (a) props 시그니처에 noindex 추가, (b) useEffect 내부에서 robots meta 동적 set/remove, (c) SSG fallback JSX에 조건부 robots meta 렌더.

  ```jsx
  import { useEffect } from 'react'

  const SITE_URL = 'https://www.earthdoomindex.com'

  function setMeta(name, content, attr = 'name') {
    if (!content) return
    let el = document.head.querySelector(`meta[${attr}="${name}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute(attr, name)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }

  function removeMeta(name, attr = 'name') {
    const el = document.head.querySelector(`meta[${attr}="${name}"]`)
    if (el) el.remove()
  }

  function setLink(rel, href, hreflang) {
    if (!href) return
    const selector = hreflang
      ? `link[rel="${rel}"][hreflang="${hreflang}"]`
      : `link[rel="${rel}"]`
    let el = document.head.querySelector(selector)
    if (!el) {
      el = document.createElement('link')
      el.setAttribute('rel', rel)
      if (hreflang) el.setAttribute('hreflang', hreflang)
      document.head.appendChild(el)
    }
    el.setAttribute('href', href)
  }

  /**
   * 페이지별 메타데이터 주입.
   *
   * @param title - <title> 태그
   * @param description - meta description
   * @param path - 사이트 루트 기준 경로 (예: "/ko/about/society")
   * @param koPath - 한국어 짝 경로 (없으면 path)
   * @param enPath - 영어 짝 경로 (없으면 path)
   * @param jsonLd - 구조화 데이터 객체 또는 배열 (없으면 생략)
   * @param noindex - true면 robots noindex,follow 메타 주입 (Phase 2: en placeholder용)
   */
  export default function PageHead({ title, description, path, koPath, enPath, jsonLd, noindex }) {
    useEffect(() => {
      if (title) document.title = title

      setMeta('description', description)
      setMeta('og:title', title, 'property')
      setMeta('og:description', description, 'property')
      setMeta('og:url', `${SITE_URL}${path}`, 'property')
      setMeta('twitter:title', title)
      setMeta('twitter:description', description)

      if (noindex) {
        setMeta('robots', 'noindex, follow')
      } else {
        removeMeta('robots')
      }

      setLink('canonical', `${SITE_URL}${path}`)
      setLink('alternate', `${SITE_URL}${koPath ?? path}`, 'ko')
      setLink('alternate', `${SITE_URL}${enPath ?? path}`, 'en')
      setLink('alternate', `${SITE_URL}${enPath ?? path}`, 'x-default')

      // JSON-LD
      const existingJsonLd = document.head.querySelectorAll('script[data-page-jsonld]')
      existingJsonLd.forEach(el => el.remove())
      if (jsonLd) {
        const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd]
        for (const item of items) {
          const script = document.createElement('script')
          script.type = 'application/ld+json'
          script.setAttribute('data-page-jsonld', 'true')
          script.textContent = JSON.stringify(item)
          document.head.appendChild(script)
        }
      }
    }, [title, description, path, koPath, enPath, jsonLd, noindex])

    // SSG 시점에는 useEffect가 안 돌므로, prerender HTML에 박히도록 정적 fallback 렌더
    return (
      <>
        {title && <title>{title}</title>}
        {description && <meta name="description" content={description} />}
        {noindex && <meta name="robots" content="noindex, follow" />}
        <link rel="canonical" href={`${SITE_URL}${path}`} />
        <link rel="alternate" hrefLang="ko" href={`${SITE_URL}${koPath ?? path}`} />
        <link rel="alternate" hrefLang="en" href={`${SITE_URL}${enPath ?? path}`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${enPath ?? path}`} />
        {jsonLd && (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((data, i) => (
          <script
            key={i}
            type="application/ld+json"
            data-page-jsonld="true"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
          />
        ))}
      </>
    )
  }
  ```

- [ ] **Step 2: lint 통과 확인**

  ```bash
  cd edi-frontend && npm run lint
  ```
  Expected: 통과.

- [ ] **Step 3: Commit**

  ```bash
  git add edi-frontend/src/seo/PageHead.jsx
  git commit -m "feat(frontend): add noindex prop to PageHead"
  ```

---

## Task 3: `/en/about` 라우트에 noindex 적용

**Files:**
- Modify: `edi-frontend/src/routes/AboutIndex.jsx`
- Modify: `edi-frontend/src/routes/AboutTopic.jsx`

- [ ] **Step 1: AboutIndex.jsx에 noindex prop 전달**

  `<PageHead ...>` 호출에 `noindex={lang === 'en'}` 추가.

  변경 전:
  ```jsx
  <PageHead
    title={title}
    description={a.indexLead}
    path={`/${lang}/about`}
    koPath="/ko/about"
    enPath="/en/about"
    jsonLd={[organizationJsonLd(), breadcrumb]}
  />
  ```

  변경 후:
  ```jsx
  <PageHead
    title={title}
    description={a.indexLead}
    path={`/${lang}/about`}
    koPath="/ko/about"
    enPath="/en/about"
    jsonLd={[organizationJsonLd(), breadcrumb]}
    noindex={lang === 'en'}
  />
  ```

- [ ] **Step 2: AboutTopic.jsx에 noindex prop 전달**

  변경 전:
  ```jsx
  <PageHead
    title={meta.title}
    description={meta.description}
    path={path}
    koPath={koPath}
    enPath={enPath}
    jsonLd={[organizationJsonLd(), breadcrumb, article]}
  />
  ```

  변경 후:
  ```jsx
  <PageHead
    title={meta.title}
    description={meta.description}
    path={path}
    koPath={koPath}
    enPath={enPath}
    jsonLd={[organizationJsonLd(), breadcrumb, article]}
    noindex={lang === 'en'}
  />
  ```

- [ ] **Step 3: 빌드 + grep 검증**

  ```bash
  cd edi-frontend && npm run build
  ```
  Expected: 성공, dist/ 생성.

  ```bash
  grep -l 'noindex, follow' edi-frontend/dist/en/about/society.html edi-frontend/dist/en/about/climate.html edi-frontend/dist/en/about/economy.html edi-frontend/dist/en/about/solar.html edi-frontend/dist/en/about/methodology.html edi-frontend/dist/en/about.html
  ```
  Expected: 6개 파일 모두 출력 (noindex 포함됨).

  ```bash
  grep -L 'noindex, follow' edi-frontend/dist/ko/about/society.html edi-frontend/dist/ko/about/climate.html edi-frontend/dist/ko/about/economy.html edi-frontend/dist/ko/about/solar.html edi-frontend/dist/ko/about/methodology.html edi-frontend/dist/ko/about.html
  ```
  Expected: 6개 파일 모두 출력 (한국어 페이지엔 noindex 없음).

  ```bash
  grep -L 'noindex' edi-frontend/dist/ko/index.html edi-frontend/dist/en/index.html
  ```
  Expected: 2개 파일 모두 출력 (메인 페이지엔 noindex 없음).

- [ ] **Step 4: Commit**

  ```bash
  git add edi-frontend/src/routes/AboutIndex.jsx edi-frontend/src/routes/AboutTopic.jsx
  git commit -m "feat(frontend): apply noindex to en/about placeholder routes"
  ```

---

## Task 4: TopicChart 실 구현

**Files:**
- Modify: `edi-frontend/src/components/TopicChart.jsx`
- Modify: `edi-frontend/src/App.css`

- [ ] **Step 1: TopicChart.jsx 전체 교체**

  ```jsx
  import { useEffect, useState } from 'react'
  import {
    LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
    ReferenceLine,
  } from 'recharts'

  const COLORS = {
    society: '#92cc41',
    climate: '#209cee',
    economy: '#f7d51d',
    solar:   '#ff6b6b',
  }

  const SOURCES = {
    society: 'GDELT Project',
    climate: 'OpenWeather API',
    economy: 'Yahoo Finance',
    solar:   'NOAA SWPC',
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
  }

  const RetroTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null
    return (
      <div style={{
        background: '#1a1a1a',
        border: '2px solid #555',
        padding: '8px 12px',
        fontSize: '9px',
        lineHeight: '2',
      }}>
        <p style={{ color: '#ddd', marginBottom: 4 }}>{formatDate(label)}</p>
        {payload.map(entry => (
          <p key={entry.dataKey} style={{ color: entry.color, margin: 0 }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }

  /**
   * 토픽별 30일 추세 차트.
   * 클라이언트 mount 후 /api/doom-history fetch → 단일 지표 라인 렌더.
   * SSG 시점엔 loading placeholder만 박힘 (의도).
   */
  export default function TopicChart({ kind, days = 30 }) {
    const [state, setState] = useState({ status: 'loading', data: [], error: null })
    const [retryNonce, setRetryNonce] = useState(0)

    useEffect(() => {
      let cancelled = false
      setState({ status: 'loading', data: [], error: null })
      const apiBase = import.meta.env.VITE_API_URL ?? ''
      fetch(`${apiBase}/api/doom-history?days=${days}`)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then(rows => {
          if (cancelled) return
          setState({ status: 'ready', data: rows, error: null })
        })
        .catch(err => {
          if (cancelled) return
          setState({ status: 'error', data: [], error: err.message })
        })
      return () => { cancelled = true }
    }, [days, retryNonce])

    const color = COLORS[kind] ?? '#aaa'
    const dataKey = `${kind}_score`
    const scores = state.data.map(d => d[dataKey]).filter(v => v != null)
    const chartMax = scores.length ? Math.max(...scores) : null
    const chartMin = scores.length ? Math.min(...scores) : null

    return (
      <section className="topic-chart-section nes-container is-dark">
        {state.status === 'loading' && (
          <div className="topic-chart-loading">
            <p>차트 데이터 불러오는 중...</p>
          </div>
        )}
        {state.status === 'error' && (
          <div className="topic-chart-error">
            <p>차트를 불러올 수 없습니다.</p>
            <button
              className="nes-btn"
              onClick={() => setRetryNonce(n => n + 1)}
            >
              다시 시도
            </button>
          </div>
        )}
        {state.status === 'ready' && state.data.length > 0 && (
          <>
            <div className="topic-chart-wrapper">
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={state.data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#444" />
                  <XAxis
                    dataKey="target_date"
                    tickFormatter={formatDate}
                    fontSize={8}
                    stroke="#666"
                    tick={{ fill: '#aaa' }}
                  />
                  <YAxis
                    fontSize={8}
                    stroke="#666"
                    tick={{ fill: '#aaa' }}
                  />
                  <Tooltip content={<RetroTooltip />} />
                  <Line
                    type="linear"
                    dataKey={dataKey}
                    name={kind}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                  />
                  {chartMax !== null && (
                    <ReferenceLine
                      y={chartMax}
                      stroke={color}
                      strokeDasharray="4 4"
                      label={{ value: '최고', fill: color, fontSize: 8, position: 'insideBottomRight' }}
                    />
                  )}
                  {chartMin !== null && chartMin !== chartMax && (
                    <ReferenceLine
                      y={chartMin}
                      stroke="#888"
                      strokeDasharray="4 4"
                      label={{ value: '최저', fill: '#888', fontSize: 8, position: 'insideTopRight' }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="topic-chart-caption">출처: {SOURCES[kind] ?? '—'} | 최근 {days}일</p>
          </>
        )}
      </section>
    )
  }
  ```

- [ ] **Step 2: App.css에 TopicChart 스타일 추가**

  파일 맨 아래에 다음 블록 append:

  ```css
  .topic-chart-section {
    margin: 24px 0;
    padding: 16px;
  }

  .topic-chart-wrapper {
    margin: 8px 0;
  }

  .topic-chart-loading,
  .topic-chart-error {
    padding: 32px 16px;
    text-align: center;
    font-size: 0.85em;
  }

  .topic-chart-error button {
    margin-top: 12px;
  }

  .topic-chart-caption {
    font-size: 0.7em;
    text-align: right;
    color: #888;
    margin-top: 4px;
  }
  ```

- [ ] **Step 3: 빌드 통과 확인**

  ```bash
  cd edi-frontend && npm run build
  ```
  Expected: 성공.

- [ ] **Step 4: 런타임 수동 검증**

  ```bash
  cd edi-frontend && npm run dev
  ```
  브라우저에서 `http://localhost:5173/ko/about/society` 진입. 약 1초 후 녹색 라인 차트가 30일치 society_score를 표시. 캡션에 "출처: GDELT Project | 최근 30일" 표시.

  DevTools Network 탭에서 `/api/doom-history?days=30` 200 응답.

  에러 시뮬레이션 (선택): `.env.local`에서 `VITE_API_URL`을 잘못된 값으로 변경 → 페이지 새로고침 → "차트를 불러올 수 없습니다." + "다시 시도" 버튼 표시. (테스트 후 원복)

  dev 서버 종료.

- [ ] **Step 5: Commit**

  ```bash
  git add edi-frontend/src/components/TopicChart.jsx edi-frontend/src/App.css
  git commit -m "feat(frontend): replace TopicChart placeholder with real recharts implementation"
  ```

---

## Task 5: AboutCard polish (hover/focus + 모바일) + about-index baseline 스타일

**Files:**
- Modify: `edi-frontend/src/components/AboutCard.jsx`
- Modify: `edi-frontend/src/App.css`

- [ ] **Step 1: AboutCard.jsx 교체 — chevron 추가, 모바일 hidden CTA**

  ```jsx
  /**
   * 허브 페이지(/{lang}/about)의 토픽 카드.
   *
   * 데스크탑: 카드 본문 + CTA 라인.
   * 모바일: CTA 라인 숨김, 우측 상단 chevron으로 클릭 가능 표시.
   */
  export default function AboutCard({ lang, topic, label, description }) {
    return (
      <a href={`/${lang}/about/${topic}`} className="about-card nes-container is-dark with-title">
        <span className="about-card-chevron" aria-hidden="true">›</span>
        <p className="title">{label}</p>
        <p className="about-card-desc">{description}</p>
        <p className="about-card-cta">
          <span className="about-card-cta-text">
            {lang === 'ko' ? '자세히 알아보기' : 'Learn more'}
          </span>
          <span className="about-card-cta-arrow">→</span>
        </p>
      </a>
    )
  }
  ```

- [ ] **Step 2: App.css에 baseline + polish 스타일 추가**

  파일 맨 아래 (Task 4에서 추가한 topic-chart 스타일 바로 뒤)에 append:

  ```css
  /* about-index 페이지 레이아웃 */
  .about-index {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 16px;
  }

  .about-index h1 {
    font-size: 1.4em;
    margin-bottom: 16px;
  }

  .about-lead {
    font-size: 0.9em;
    line-height: 1.7;
    margin-bottom: 24px;
    opacity: 0.95;
  }

  .about-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .about-methodology {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 2px dashed #555;
  }

  /* AboutCard polish */
  .about-card {
    position: relative;
    display: block;
    padding: 24px 20px;
    text-decoration: none;
    color: inherit;
    cursor: pointer;
    transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
  }

  .about-card:hover,
  .about-card:focus-visible {
    transform: translate(-2px, -2px);
    box-shadow: 4px 4px 0 #e76e55;
    outline: none;
  }

  .about-card-desc {
    font-size: 0.85em;
    line-height: 1.6;
    margin: 8px 0 12px;
  }

  .about-card-cta {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 0.8em;
    color: #e76e55;
    margin-bottom: 0;
  }

  .about-card-cta-arrow {
    transition: transform 0.1s ease-out;
  }

  .about-card:hover .about-card-cta-arrow,
  .about-card:focus-visible .about-card-cta-arrow {
    transform: translateX(4px);
  }

  .about-card-chevron {
    display: none;
    position: absolute;
    top: 12px;
    right: 16px;
    font-size: 1.4em;
    color: #e76e55;
  }

  /* about-topic 페이지 (MDX 본문 영역) — 가독성 baseline */
  .about-topic {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 16px;
  }

  .about-topic h1 {
    font-size: 1.4em;
    margin-bottom: 8px;
  }

  .about-topic h2 {
    font-size: 1.05em;
    margin-top: 28px;
    margin-bottom: 8px;
  }

  .about-topic h3 {
    font-size: 0.95em;
    margin-top: 16px;
    margin-bottom: 4px;
  }

  .about-topic p,
  .about-topic li {
    font-size: 0.85em;
    line-height: 1.8;
  }

  .about-topic ul,
  .about-topic ol {
    padding-left: 20px;
    margin: 8px 0;
  }

  .about-topic code {
    background: #2a2a2a;
    padding: 2px 6px;
    font-size: 0.9em;
  }

  .breadcrumb {
    font-size: 0.75em;
    margin-bottom: 16px;
    opacity: 0.8;
  }

  .breadcrumb a {
    color: #88c;
    text-decoration: underline;
  }

  /* 모바일 (≤640px) */
  @media (max-width: 640px) {
    .about-card {
      padding: 20px 16px;
    }
    .about-card-cta {
      display: none;
    }
    .about-card-chevron {
      display: block;
    }
    .about-methodology {
      margin-top: 16px;
      padding-top: 12px;
    }
  }
  ```

- [ ] **Step 3: 빌드 통과 확인**

  ```bash
  cd edi-frontend && npm run build
  ```

- [ ] **Step 4: 런타임 수동 검증**

  ```bash
  cd edi-frontend && npm run dev
  ```
  - `http://localhost:5173/ko/about` 진입. 카드 호버 시 picture 그림자 + 살짝 들림 효과, CTA 화살표가 우측으로 슬라이드. 키보드 Tab → focus-visible에 동일 효과.
  - DevTools에서 모바일 뷰포트(예: iPhone SE 375px) 토글 → 카드 padding 줄고, "자세히 알아보기 →" 라인 사라지고 우측 상단에 `›` chevron 표시.
  - methodology 카드는 데스크탑에선 점선 구분선 위, 모바일에선 동일하게 구분선 위 (단 padding은 작아짐).

  dev 서버 종료.

- [ ] **Step 5: Commit**

  ```bash
  git add edi-frontend/src/components/AboutCard.jsx edi-frontend/src/App.css
  git commit -m "feat(frontend): polish AboutCard interactions and add about page baseline styles"
  ```

---

## Task 6: society.mdx 한국어 본문

**Files:**
- Modify: `edi-frontend/src/content/ko/society.mdx`

**참조 파일** (구현 시 읽기):
- `edi-backend/services/societyService.js` — CAMEO 코드 가중치, NumMentions 정규화 로직, BREAKPOINTS

- [ ] **Step 1: 백엔드 societyService.js의 핵심 사실 추출**

  반드시 본문에 포함할 사실:
  - 데이터 출처: GDELT V2 (Global Database of Events, Language, and Tone), `lastupdate.txt` 기반 15분 윈도우.
  - CAMEO 분류 카테고리와 가중치:
    - 코드 20: 비전통적 대량폭력(테러/대량학살/WMD) — 가중치 30
    - 코드 19: 전투·무력충돌 — 가중치 5
    - 코드 18: 폭행·폭격 — 가중치 4
    - 코드 17/15/13: 강제·군사력 과시·위협 — 각 가중치 1
    - 코드 14: 시위·집회 — 가중치 0.2 (압축)
  - NumMentions 보정: `log10(mentions+1)`로 보정 (큰 사건일수록 가중, 전 세계 보도량 반영).
  - 점수 환산: 비대칭 가중합 → 7구간 BREAKPOINTS 선형 보간으로 0~30점.

- [ ] **Step 2: society.mdx 본문 교체**

  파일 전체를 다음 구조로 작성. 본문 분량 1,500~2,500자(한글 기준).

  frontmatter와 import는 유지. `# 사회 위협 지수란?` 아래부터 새로 작성. H2 5개:

  ```mdx
  ---
  title: "사회 위협 지수란? — GDELT 기반 글로벌 갈등 측정 | Earth Doom Index"
  description: "GDELT 뉴스 데이터와 CAMEO 코드로 전 세계 시위·분쟁·테러를 0~30점으로 환산하는 Earth Doom Index의 사회 위협 지수 계산법을 설명합니다."
  keywords: ["GDELT", "CAMEO 코드", "사회 갈등 지수", "지정학 위험"]
  publishedAt: "2026-04-26"
  ---

  export const meta = {
    title: "사회 위협 지수란? — GDELT 기반 글로벌 갈등 측정 | Earth Doom Index",
    description: "GDELT 뉴스 데이터와 CAMEO 코드로 전 세계 시위·분쟁·테러를 0~30점으로 환산하는 Earth Doom Index의 사회 위협 지수 계산법을 설명합니다.",
    publishedAt: "2026-04-26",
  }

  import TopicChart from '../../components/TopicChart.jsx'
  import CrossLinks from '../../components/CrossLinks.jsx'

  # 사회 위협 지수란?

  [한 줄 요약 lead 문단 — 약 200자. 어떤 데이터로 무엇을 측정해서 어떤 점수로 환산하는지 한 호흡에 설명. 도입 톤은 살리되 정보 우선. 예: "Earth Doom Index의 사회 위협 지수는 전 세계 뉴스 이벤트 데이터(GDELT)에서 시위·무력충돌·테러를 추출해, 사건의 종류와 보도량을 가중합산한 뒤 0~30점으로 환산한 지표입니다."]

  ## 1. 이 지수란 무엇인가

  [정의 단락 — 약 250자. "사회 위협 지수"가 무엇이며, Earth Doom Index 4개 영역 중 어디에 해당하는지, 측정 대상은 무엇인지(글로벌 단위 사건 빈도와 강도) 설명.]

  ## 2. 데이터 출처

  [GDELT 소개 — 약 350자. GDELT의 정식 명칭(Global Database of Events, Language, and Tone), Georgetown 대학 발 프로젝트, 15분 단위 갱신, 전 세계 100여 언어 뉴스 추적. lastupdate.txt 메커니즘 간단히 언급. 라이선스 무료·공개.]

  ## 3. 계산 방식

  [3단 구조 — 약 500자.
  (1) 어떤 사건을 추출하는가: CAMEO 분류 중 위협성 높은 카테고리만 선별.
  (2) 어떻게 가중하는가: 카테고리별 비대칭 가중치 표(코드 20=30점, 19=5점, 18=4점, 17/15/13=1점, 14=0.2점). 표 형식으로 제시.
  (3) 어떻게 점수로: 보도량 보정(log10(mentions+1)) → 가중합 → 7구간 BREAKPOINTS 선형 보간 → 0~30점.
  ]

  ## 4. CAMEO 코드 분류와 가중치

  [토픽 특화 H2 — 약 500자. CAMEO가 무엇인지 (Conflict and Mediation Event Observations), 카테고리 체계 개요, 왜 비대칭 가중치가 필요한지(시위 노이즈와 임계 사건 분리). 가중치 표 한 번 더 짧게 제시 가능.]

  ## 5. 한계와 주의

  [약 250자. 측정의 한계 — (a) 영어권 보도 편향, (b) 보도량 ≠ 실제 사건 규모, (c) 서구 미디어 관점 편향, (d) 토이 프로젝트라는 컨텍스트. 가능한 분량 내에서 자조적 톤 한 문장 허용.]

  <TopicChart kind="society" days={30} />

  <CrossLinks current="society" lang="ko" />
  ```

- [ ] **Step 3: 빌드 통과 + 본문 prerender 확인**

  ```bash
  cd edi-frontend && npm run build
  grep -c "사회 위협 지수란" edi-frontend/dist/ko/about/society.html
  grep -c "CAMEO" edi-frontend/dist/ko/about/society.html
  ```
  Expected: 두 grep 모두 1 이상.

- [ ] **Step 4: lint 통과 확인**

  ```bash
  cd edi-frontend && npm run lint
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add edi-frontend/src/content/ko/society.mdx
  git commit -m "feat(frontend): write society.mdx Korean content (Phase 2)"
  ```

---

## Task 7: climate.mdx 한국어 본문

**Files:**
- Modify: `edi-frontend/src/content/ko/climate.mdx`

**참조 파일** (구현 시 읽기):
- `edi-backend/services/climateService.js`

- [ ] **Step 1: climateService.js의 핵심 사실 추출**

  반드시 본문에 포함할 사실:
  - 데이터 출처: OpenWeatherMap API (Current Weather + Air Quality).
  - 7개 거점 도시: Seoul, New York, Mumbai, Tokyo, Sydney, Cairo, Moscow.
  - 임계값: 체감온도 30°C 이상(폭염), -10°C 이하(한파).
  - 극단 기상 코드: 토네이도(2.0), 화산재/극한강수(1.8), 산불연기(1.5), 스콜/매우 강한 비/어는 비/모래·먼지폭풍(1.2), 강한 비(0.8), 뇌우 200~232 카테고리(1.2).
  - 풍속 점수: 허리케인(32.7m/s+ → 2.0), 폭풍(24.5+ → 1.5), 강풍(17.2+ → 0.8).
  - 열습도 스트레스: 30°C+90% → 1.0, 28°C+85% → 0.5.
  - AQI 점수 (0~1점): AQI 1(Good)→0 … AQI 5(Very Poor)→1.
  - 도시별 종합 점수 → 평균 → 0~30점 환산.

- [ ] **Step 2: climate.mdx 본문 교체**

  ```mdx
  ---
  title: "기후 위협 지수란? — 거점 도시 극단 기상 측정 | Earth Doom Index"
  description: "OpenWeather API로 7개 글로벌 거점 도시의 극단 기상·열습도·대기질을 수집해 0~30점으로 환산하는 기후 위협 지수의 계산 방식을 설명합니다."
  keywords: ["기후 위협", "OpenWeather", "극단 기상", "체감온도", "AQI"]
  publishedAt: "2026-04-26"
  ---

  export const meta = {
    title: "기후 위협 지수란? — 거점 도시 극단 기상 측정 | Earth Doom Index",
    description: "OpenWeather API로 7개 글로벌 거점 도시의 극단 기상·열습도·대기질을 수집해 0~30점으로 환산하는 기후 위협 지수의 계산 방식을 설명합니다.",
    publishedAt: "2026-04-26",
  }

  import TopicChart from '../../components/TopicChart.jsx'
  import CrossLinks from '../../components/CrossLinks.jsx'

  # 기후 위협 지수란?

  [Lead 문단 — 200자. 기후 위협 지수가 무엇을 측정하고 어떤 식으로 점수가 되는지 한 호흡 요약.]

  ## 1. 이 지수란 무엇인가

  [정의 — 약 250자. 기후 위협 지수의 정체, 기상 재해 측정 의도, 4영역 중 위치.]

  ## 2. 데이터 출처

  [OpenWeatherMap API 설명 — 약 350자. Current Weather + Air Pollution 두 엔드포인트, 7개 거점 도시(서울/뉴욕/뭄바이/도쿄/시드니/카이로/모스크바)를 표본으로 선택한 이유(대륙 분산·기후 다양성), 분당 호출 한도와 비용 모델.]

  ## 3. 계산 방식

  [도시 단위 점수 산출 → 평균 → 환산 — 약 500자.
  도시별 점수 = 체감온도(0~2) + 극단 기상/풍속(0~2) + 열습도 스트레스(0~1) + 대기질(0~1) = 최대 6점.
  7개 도시 평균 → 0~30점 선형 보간.
  체감온도 임계: 30°C 이상에서 (feelsLike-30)/10×2, -10°C 이하에서 같은 방식. 풍속 카테고리(허리케인/폭풍/강풍).
  ]

  ## 4. 이상 기상 임계값

  [토픽 특화 H2 — 약 500자. 극단 기상 분류표:
  - 토네이도(코드 781) 2.0점
  - 화산재(762)/극한 강수(504) 1.8점
  - 산불 연기(711) 1.5점
  - 스콜·매우 강한 비·어는 비·모래/먼지폭풍 1.2점
  - 뇌우(200~232 그룹) 1.2점
  - 강한 비(502) 0.8점
  WMO 분류 코드 OpenWeather가 어떻게 매핑하는지 1~2문장 설명. 임계값을 30°C로 잡은 이유(WHO 폭염 정의 참고).]

  ## 5. 한계와 주의

  [약 250자. 한계 — 7개 도시 표본의 대표성, 빈민 지역 미반영, OpenWeather 무료티어의 데이터 갱신 지연(분 단위), 토이 프로젝트 컨텍스트.]

  <TopicChart kind="climate" days={30} />

  <CrossLinks current="climate" lang="ko" />
  ```

- [ ] **Step 3: 빌드 + grep 검증**

  ```bash
  cd edi-frontend && npm run build
  grep -c "기후 위협 지수란" edi-frontend/dist/ko/about/climate.html
  grep -c "OpenWeather" edi-frontend/dist/ko/about/climate.html
  ```
  Expected: 두 grep 모두 1 이상.

- [ ] **Step 4: lint 통과 + Commit**

  ```bash
  cd edi-frontend && npm run lint
  git add edi-frontend/src/content/ko/climate.mdx
  git commit -m "feat(frontend): write climate.mdx Korean content (Phase 2)"
  ```

---

## Task 8: economy.mdx 한국어 본문

**Files:**
- Modify: `edi-frontend/src/content/ko/economy.mdx`

**참조 파일** (구현 시 읽기):
- `edi-backend/services/economyService.js`
- `docs/superpowers/specs/2026-04-25-economy-score-redesign-design.md` (있으면) — 5-signal stress 모델 배경

- [ ] **Step 1: economyService.js의 핵심 사실 추출**

  반드시 본문에 포함할 사실:
  - 데이터 출처: Yahoo Finance (`query1.finance.yahoo.com/v8/finance/chart`).
  - 5개 신호:
    1. **VIX (CBOE 변동성 지수)** — 현재가 fetch. 12→0, 15→1, 20→3, 30→6, 40→9, 60→12 stress.
    2. **S&P 500 일변동률** — 1년 시계열에서 전일 대비 변동률 절댓값. 1%→0, 2%→2, 3%→3, 5%→5, 7%→6.
    3. **S&P 500 1년 drawdown** — 1년 고점 대비 현재가 하락률. 5%→0, 10%→2, 20%→5, 30%→8, 40%→11, 50%→12.
    4. **HYG (하이일드 회사채 ETF) drawdown** — 신용 스트레스 신호. 3%→0, 7%→2, 12%→5, 18%→8, 22%→11, 25%→12.
    5. **수익률곡선 (10년물 ^TNX − 3개월물 ^IRX)** — 음수일수록 역전(침체 신호). 0bp→0, 30→1, 50→3, 100→5, 150→7, 200→8.
  - 5개 합산 stress (최대 ~50점) → SCORE_BREAKPOINTS [0,5,12,20,28,36,42] → 0~30점.

- [ ] **Step 2: economy.mdx 본문 교체**

  ```mdx
  ---
  title: "경제 위협 지수란? — 5종 시장 신호 합산 | Earth Doom Index"
  description: "VIX, S&P 500, 하이일드 채권, 수익률곡선 5개 시장 신호를 stress points로 환산해 0~30점 경제 위협 지수를 산출하는 방식을 설명합니다."
  keywords: ["경제 위협", "VIX", "S&P 500", "수익률곡선", "하이일드"]
  publishedAt: "2026-04-26"
  ---

  export const meta = {
    title: "경제 위협 지수란? — 5종 시장 신호 합산 | Earth Doom Index",
    description: "VIX, S&P 500, 하이일드 채권, 수익률곡선 5개 시장 신호를 stress points로 환산해 0~30점 경제 위협 지수를 산출하는 방식을 설명합니다.",
    publishedAt: "2026-04-26",
  }

  import TopicChart from '../../components/TopicChart.jsx'
  import CrossLinks from '../../components/CrossLinks.jsx'

  # 경제 위협 지수란?

  [Lead 문단 — 200자.]

  ## 1. 이 지수란 무엇인가

  [정의 — 약 250자. 시장 스트레스 측정 의도. 단일 지표가 아닌 5종 합산.]

  ## 2. 데이터 출처

  [Yahoo Finance API 설명 — 약 300자. 비공식 chart endpoint, 1년 시계열 + 단일 현재가, 무료, 인증 불필요. 사용 티커: ^GSPC, HYG, ^VIX, ^TNX, ^IRX.]

  ## 3. 계산 방식

  [3단계 — 약 500자.
  (1) 각 신호별로 piecewise linear stress 변환표(2.~6.에서 상세).
  (2) 5개 stress 합산 (최대 약 50점).
  (3) SCORE_BREAKPOINTS [(0,0)(5,3)(12,8)(20,14)(28,20)(36,26)(42,30)]로 0~30점 환산.
  최근 리디자인에서 단일 변동률 기반에서 5종 합산으로 전환한 이유 한 문장.]

  ## 4. 5종 위협 신호 해부

  [토픽 특화 H2 — 약 700자. 다섯 신호를 각각 H3 또는 굵은 라벨로 묶어 설명:
  ### VIX (변동성 지수): 시장 두려움 측정. 임계값 12/15/20/30/40/60.
  ### S&P 500 일변동률: 단기 충격 신호. 절댓값 사용(폭락·폭등 모두 위협).
  ### S&P 500 drawdown: 장기 추세 손상. 1년 고점 대비.
  ### HYG drawdown: 신용 스프레드 대용. 신용 스트레스 직접 신호.
  ### 수익률곡선 (10Y - 3M): 침체 선행 지표. 역전 시 12~18개월 내 침체 패턴.]

  ## 5. 한계와 주의

  [약 250자. 한계 — 미국 시장 편향, 신흥국 미반영, 1년 윈도우의 짧음, 시장이 곧 경제는 아니라는 점, 토이 프로젝트.]

  <TopicChart kind="economy" days={30} />

  <CrossLinks current="economy" lang="ko" />
  ```

- [ ] **Step 3: 빌드 + grep 검증**

  ```bash
  cd edi-frontend && npm run build
  grep -c "경제 위협 지수란" edi-frontend/dist/ko/about/economy.html
  grep -c "VIX" edi-frontend/dist/ko/about/economy.html
  ```

- [ ] **Step 4: lint 통과 + Commit**

  ```bash
  cd edi-frontend && npm run lint
  git add edi-frontend/src/content/ko/economy.mdx
  git commit -m "feat(frontend): write economy.mdx Korean content (Phase 2)"
  ```

---

## Task 9: solar.mdx 한국어 본문

**Files:**
- Modify: `edi-frontend/src/content/ko/solar.mdx`

**참조 파일** (구현 시 읽기):
- `edi-backend/services/solarService.js`

- [ ] **Step 1: solarService.js의 핵심 사실 추출**

  반드시 본문에 포함할 사실:
  - 데이터 출처: NOAA SWPC (Space Weather Prediction Center) 두 엔드포인트.
    - `planetary_k_index_1m.json` — 1분 단위 Kp 지수.
    - `goes/primary/xrays-1-day.json` — GOES 위성 X선 플럭스.
  - 두 신호 합산 (최대 10점):
    - **Kp 지수** (0~7점): 0~3 정상, 4 활동증가(0.8점), 5 G1 약폭풍(2점), 6 G2 보통폭풍(3.5점), 7 G3 강폭풍(5점), 8 G4 격렬(6.5점), 9 G5 극심(7점).
    - **X선 플레어** (0~3점): M1(1e-5 W/m²)~M5(5e-5)→0~1.5, M5~X1(1e-4)→1.5~2.5, X1+→2.5~3.
  - Kp 라벨: G1~G5 지자기 폭풍 등급 (NOAA 공식).
  - 플레어 등급: M급(중간)/X급(강력) 분류 표준.
  - solarScore (최대 10) → 30점 환산은 `* 3` 단순 비례 (다른 지수와의 0~30 통일).

- [ ] **Step 2: solar.mdx 본문 교체**

  ```mdx
  ---
  title: "태양 위협 지수란? — Kp 폭풍과 X급 플레어 측정 | Earth Doom Index"
  description: "NOAA SWPC 실시간 데이터로 지자기 폭풍(Kp 지수)과 태양 X선 플레어를 결합해 0~30점으로 환산하는 태양 위협 지수의 계산 방식을 설명합니다."
  keywords: ["태양 위협", "Kp 지수", "지자기 폭풍", "태양 플레어", "NOAA SWPC"]
  publishedAt: "2026-04-26"
  ---

  export const meta = {
    title: "태양 위협 지수란? — Kp 폭풍과 X급 플레어 측정 | Earth Doom Index",
    description: "NOAA SWPC 실시간 데이터로 지자기 폭풍(Kp 지수)과 태양 X선 플레어를 결합해 0~30점으로 환산하는 태양 위협 지수의 계산 방식을 설명합니다.",
    publishedAt: "2026-04-26",
  }

  import TopicChart from '../../components/TopicChart.jsx'
  import CrossLinks from '../../components/CrossLinks.jsx'

  # 태양 위협 지수란?

  [Lead 문단 — 200자.]

  ## 1. 이 지수란 무엇인가

  [정의 — 약 250자. 우주 기상 위협의 정체, 지구 인프라(GPS, 통신, 전력망)에 대한 영향.]

  ## 2. 데이터 출처

  [NOAA SWPC 설명 — 약 350자. 미 국립해양대기청 산하 우주기상예측센터, 정식 명칭, 1분 단위 갱신, 두 엔드포인트(Kp 지수 / GOES 위성 X선), 데이터 무료·실시간 공개.]

  ## 3. 계산 방식

  [2축 합산 — 약 400자.
  Kp 점수(최대 7) + 플레어 점수(최대 3) = 최대 10점.
  10점 → 30점 환산은 단순 비례.
  각 축의 piecewise linear curve.]

  ## 4. Kp 지수와 X급 플레어 등급

  [토픽 특화 H2 — 약 600자. 두 지표 깊이 설명:
  ### Kp 지수: 지자기장 교란 측정. 0~9 9단계. NOAA G1~G5 폭풍 등급 매핑(5=G1, 6=G2, 7=G3, 8=G4, 9=G5). 실제 영향: G3 이상에서 GPS 정확도 저하·HF 통신 두절·고위도 오로라.
  ### X선 플레어 등급: 태양 표면 폭발의 X선 플럭스 분류. 클래스 A < B < C < M < X (10배씩 증가). 본 지수는 M(1e-5 W/m²)부터 점수화. X급은 짧은 시간 GPS·라디오 통신 단절. 1859년 Carrington 사건이 X급 사례.]

  ## 5. 한계와 주의

  [약 200자. 한계 — Kp는 후행 지표(폭풍 진행 중 측정), 단일 위성 의존, 지구 거주 영향은 위도에 따라 다름, 토이 프로젝트.]

  <TopicChart kind="solar" days={30} />

  <CrossLinks current="solar" lang="ko" />
  ```

- [ ] **Step 3: 빌드 + grep 검증**

  ```bash
  cd edi-frontend && npm run build
  grep -c "태양 위협 지수란" edi-frontend/dist/ko/about/solar.html
  grep -c "NOAA" edi-frontend/dist/ko/about/solar.html
  ```

- [ ] **Step 4: lint + Commit**

  ```bash
  cd edi-frontend && npm run lint
  git add edi-frontend/src/content/ko/solar.mdx
  git commit -m "feat(frontend): write solar.mdx Korean content (Phase 2)"
  ```

---

## Task 10: methodology.mdx 한국어 본문

**Files:**
- Modify: `edi-frontend/src/content/ko/methodology.mdx`

**참조 파일** (구현 시 읽기):
- `edi-backend/scheduler.js` — 일일 크론 시점·UTC 기준
- `edi-backend/services/*.js` — 4개 서비스 모두
- `edi-frontend/src/i18n.js` — `dangerLevel` 라벨 (메인 페이지에서 쓰는 6단계)
- `edi-frontend/api/og.js` — danger 임계값 (`getDangerInfo`: 86/71/51/31/16)

- [ ] **Step 1: 핵심 사실 추출**

  반드시 본문에 포함할 사실:
  - 4영역 점수 합산: society(0~30) + climate(0~30) + economy(0~30) + solar(0~30) = 0~120... 이 아니라, **각 영역이 0~30점으로 통일되고 단순 합산**으로 0~100점 만점 (각 영역 25%로 정규화) 또는 4 합산 후 표현. 실제 합산 로직은 `db/index.js` 또는 `scheduler.js`에서 확인 후 사실 그대로 기재.
  - 위험 등급 6단계 (`getDangerInfo` 기준): 86+ DOOM, 71+ BEYOND RECOVERY (CRITICAL), 51+ NEAR CRITICAL (DANGER), 31+ ACCELERATING (CAUTION), 16+ ANOMALY DETECTED (NOTICE), 0~15 PEACEFUL ILLUSION (SAFE).
  - 갱신 주기: 일 1회, UTC 기준 자정 직후 크론. 일 단위로만 결과를 저장 (`doom_records` 테이블 1일 1행).
  - 재현 가능성: 외부 데이터(GDELT/OpenWeather/Yahoo Finance/NOAA) 시점 의존이라 동일 입력 재현 한계 있음.

- [ ] **Step 2: methodology.mdx 본문 교체**

  ```mdx
  ---
  title: "Earth Doom Index 산정 방법론 — 4개 지수 통합과 위험 등급"
  description: "사회·기후·경제·태양 4개 영역 위협 지수를 종합해 0~100점 멸망 지수로 환산하고 6단계 위험 등급을 부여하는 Earth Doom Index의 산정 방법론입니다."
  keywords: ["Earth Doom Index", "산정 방법론", "위험 등급", "DOOM-9000"]
  publishedAt: "2026-04-26"
  ---

  export const meta = {
    title: "Earth Doom Index 산정 방법론 — 4개 지수 통합과 위험 등급",
    description: "사회·기후·경제·태양 4개 영역 위협 지수를 종합해 0~100점 멸망 지수로 환산하고 6단계 위험 등급을 부여하는 Earth Doom Index의 산정 방법론입니다.",
    publishedAt: "2026-04-26",
  }

  import CrossLinks from '../../components/CrossLinks.jsx'

  # Earth Doom Index 산정 방법론

  [Lead 문단 — 약 250자. 종합 산정의 큰 그림: 4개 영역 → 합산 → 등급화. 한 호흡 요약.]

  ## 1. DOOM-9000 산정 원리

  [약 400자. 4영역 통합 개요. 각 영역이 독립적으로 0~30점으로 산출되는 이유(영역마다 다른 데이터 소스·서로 다른 자연 단위), 4영역을 단순 합산해 0~120점이 아닌 0~100점으로 정규화하는 방식 (실제 합산 공식은 backend 코드 확인 후 정확히 기재).]

  ## 2. 영역별 가중치와 정규화

  [약 500자. 각 영역의 점수 환산 방식 요약 (society BREAKPOINTS, climate 도시평균×환산, economy stress 합산, solar Kp+플레어). 왜 4영역을 동등 가중치로 두는가에 대한 설계 결정. 추후 가중치 조정 가능성 한 문장.]

  ## 3. 위험 등급 기준

  [약 500자. 6단계 등급표 — 점수 범위 / 한국어 라벨 / 의미.
  표 형식 권장:
  | 점수 | 등급 | 의미 |
  | 86~100 | 결과는 명백함 | DOOM |
  | 71~85 | 회복 불가 | CRITICAL |
  | 51~70 | 임계점 근접 | DANGER |
  | 31~50 | 가속 중 | CAUTION |
  | 16~30 | 이상 징후 감지 | NOTICE |
  | 0~15 | 평온한 착각 | SAFE |
  각 등급 짧은 부연.]

  ## 4. 데이터 갱신 주기와 시점

  [약 350자. UTC 기준 일 1회 크론(scheduler.js), 자정 직후 4개 서비스 호출, 결과 doom_records 테이블에 단일 행 저장. 시간대 처리: 한국 사용자는 UTC+9이라 한국 시간 오전 9시쯤 그 날의 점수 확인 가능.]

  ## 5. 재현 가능성과 한계

  [약 350자. 외부 데이터 시점 의존(GDELT는 15분 단위 갱신이라 시점 차이로 같은 날도 값 다름), Yahoo Finance 미국 장 시간 영향, OpenWeather 무료티어의 지연. 토이 프로젝트로서 학술 재현성 보장 안 함. 자조적 한 문장 가능.]

  <CrossLinks current="methodology" lang="ko" />
  ```

  **중요**: 본문 작성 전 `edi-backend/scheduler.js`와 `edi-backend/db/index.js`(또는 합산 로직 위치)를 직접 읽어 점수 환산 공식이 spec 문서와 일치하는지 확인. 가정으로 쓰지 말고 실제 코드를 인용.

- [ ] **Step 3: 빌드 + grep 검증**

  ```bash
  cd edi-frontend && npm run build
  grep -c "산정 방법론" edi-frontend/dist/ko/about/methodology.html
  grep -c "DOOM-9000" edi-frontend/dist/ko/about/methodology.html
  ```

- [ ] **Step 4: lint + Commit**

  ```bash
  cd edi-frontend && npm run lint
  git add edi-frontend/src/content/ko/methodology.mdx
  git commit -m "feat(frontend): write methodology.mdx Korean content (Phase 2)"
  ```

---

## Task 11: about 인덱스 lead 문단 확장 (i18n.js)

**Files:**
- Modify: `edi-frontend/src/i18n.js`

- [ ] **Step 1: 현재 ko의 `about.indexLead` 위치 확인**

  ```bash
  grep -n "indexLead" edi-frontend/src/i18n.js
  ```
  Expected: ko 블록에 1줄, en 블록에 1줄.

- [ ] **Step 2: ko의 `about.indexLead` 값을 500~800자 한국어 본문으로 교체**

  현재값(짧은 문장)을 다음 패턴으로 확장. 영어 키는 변경 금지(Phase 3에서 다룸).

  교체 본문 가이드 (정확한 자수는 본문 작성 시 조정):
  - 1단락 (~200자): Earth Doom Index의 정체성. 토이 프로젝트로서 4개 지수를 매일 계산한다는 점, 각 지수가 무엇을 측정하는지 한 줄씩.
  - 2단락 (~250자): 왜 만들었는가. 진지함과 농담의 경계, "지구는 망했는가?"라는 질문을 데이터로 답해보려는 시도.
  - 3단락 (~200자): 어떻게 읽으면 되는가. 각 카드를 클릭해 측정 방식을 확인. methodology에서 종합 산정 보기. 예측에 활용하지 말 것.

  교체는 단일 string literal로. 줄바꿈은 `\n\n` 사용.

  실제 i18n 키 형식 예시 (값만 새로 작성, 키는 그대로):
  ```js
  // ko 블록 내 about.indexLead
  indexLead: '[1단락 본문]\n\n[2단락 본문]\n\n[3단락 본문]',
  ```

  AboutIndex.jsx가 `<p className="about-lead">{a.indexLead}</p>` 한 줄로만 렌더하므로, `\n\n`을 단락 분리로 보여주려면 별도 처리가 필요할 수 있다. 만약 한 단락으로 보이는 게 문제면, AboutIndex.jsx를 다음으로 함께 수정 (split 후 map):

  변경 전:
  ```jsx
  <p className="about-lead">{a.indexLead}</p>
  ```

  변경 후:
  ```jsx
  <div className="about-lead">
    {a.indexLead.split('\n\n').map((para, i) => (
      <p key={i}>{para}</p>
    ))}
  </div>
  ```

  이 변경이 필요하면 `edi-frontend/src/routes/AboutIndex.jsx`도 함께 수정한다.

- [ ] **Step 3: 빌드 + grep 검증**

  ```bash
  cd edi-frontend && npm run build
  grep -o "about-lead" edi-frontend/dist/ko/about.html | head -1
  ```
  Expected: about-lead 클래스 노출됨.

  본문 길이 spot check:
  ```bash
  python3 -c "
  import re, sys
  html = open('edi-frontend/dist/ko/about.html').read()
  m = re.search(r'<div class=\"about-lead\">(.*?)</div>', html, re.S) or re.search(r'<p class=\"about-lead\">(.*?)</p>', html, re.S)
  text = re.sub(r'<[^>]+>', '', m.group(1)) if m else ''
  print(f'문자 수(공백 포함): {len(text)}')"
  ```
  Expected: 500자 이상.

- [ ] **Step 4: lint + Commit**

  ```bash
  cd edi-frontend && npm run lint
  git add edi-frontend/src/i18n.js
  # AboutIndex.jsx도 수정했으면 함께 add
  git diff --name-only
  git commit -m "feat(frontend): expand ko about index lead paragraph (Phase 2)"
  ```

---

## Task 12: 최종 검증 + PR

**Files:** 없음 (검증 + git 작업).

- [ ] **Step 1: 전체 빌드 + lint 한 번 더**

  ```bash
  cd edi-frontend && npm run build && npm run lint
  ```
  Expected: 둘 다 성공.

- [ ] **Step 2: dist 산출물 종합 검증**

  ```bash
  ls edi-frontend/dist/ko/about/
  ls edi-frontend/dist/en/about/
  grep -c "noindex, follow" edi-frontend/dist/en/about/*.html edi-frontend/dist/en/about.html
  grep -c "noindex" edi-frontend/dist/ko/about/*.html edi-frontend/dist/ko/about.html
  ```
  Expected: en 6개 파일에 각 1, ko 6개 파일에 각 0.

- [ ] **Step 3: 각 ko about 페이지 본문 길이 spot check**

  ```bash
  for f in society climate economy solar methodology; do
    chars=$(python3 -c "
  import re
  html = open('edi-frontend/dist/ko/about/$f.html').read()
  m = re.search(r'<main class=\"about-topic\">(.*?)</main>', html, re.S)
  text = re.sub(r'<[^>]+>', '', m.group(1)) if m else ''
  print(len(text.replace(chr(10), '').replace(' ', '')))")
    echo "$f: $chars chars"
  done
  ```
  Expected: 각 1,200~3,000자 범위 (HTML 제거 후 공백 제거 기준).

- [ ] **Step 4: dev 서버 종합 수동 검증**

  ```bash
  cd edi-frontend && npm run dev
  ```
  체크리스트:
  - `/ko/about` 카드 호버/포커스 효과 + 모바일 chevron 확인.
  - `/ko/about/{topic}` 5개 페이지 본문 + TopicChart 정상 렌더 + CrossLinks 4개.
  - `/ko/about/methodology` 본문 정상 + CrossLinks (이 페이지엔 TopicChart 없음).
  - 언어 토글 → `/en/about/society` 등 영어 페이지가 placeholder 그대로 + meta robots noindex.
  - 메인 `/ko` → 점수 카드 모달 → "자세히 알아보기" → about/topic 정상 이동.

  dev 서버 종료.

- [ ] **Step 5: Push + PR 생성**

  ```bash
  git push -u origin feature/explainer-pages-phase2
  gh pr create --title "feat(frontend): explainer pages Phase 2 — Korean content & TopicChart" --body "$(cat <<'EOF'
  ## Summary
  - 한국어 about 콘텐츠 5개 MDX(society/climate/economy/solar/methodology) + about 인덱스 lead 본문 확장
  - `<TopicChart>` placeholder를 클라이언트 fetch + recharts LineChart로 교체
  - AboutCard hover/focus 인터랙션 강화 + 모바일 레이아웃 개선 (chevron, padding 축소)
  - 영어 placeholder 라우트 6개에 `<meta name="robots" content="noindex, follow">` 추가 (thin content 인덱싱 방지, Phase 3 완료 시 해제)

  ## Spec
  `docs/superpowers/specs/2026-04-27-explainer-pages-phase2-design.md`

  ## Plan
  `docs/superpowers/plans/2026-04-27-explainer-pages-phase2.md`

  ## Test plan
  - [x] `npm run build` 성공, dist/ 15개 정적 HTML 생성 확인
  - [x] `dist/en/about/*.html` 6개 모두 noindex 메타 포함 / `dist/ko/about/*.html` 6개 모두 미포함 확인
  - [x] 각 ko about 페이지 본문 1,200자+ prerender 확인
  - [x] dev 서버에서 TopicChart 1초 내 렌더, AboutCard 호버 효과, 모바일 chevron 동작 확인
  - [ ] Vercel 배포 후 cleanUrls 정상 / `view-source:`로 본문 prerender 확인

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  EOF
  )"
  ```

---

## Self-Review

**1. Spec 커버리지**
- ✅ 목표 1 (한국어 콘텐츠 6개): Tasks 6~11
- ✅ 목표 2 (TopicChart 실 구현): Task 4
- ✅ 목표 3 (AboutCard polish): Task 5
- ✅ 목표 4 (영어 noindex): Tasks 2, 3
- ✅ 비목표 (영어 본문, OG, /data, 자동 테스트, Search Console 등록): plan에 미포함, 의도대로

**2. Placeholder 점검**
- 콘텐츠 task의 H2 outline은 prose 자체가 아니라 가이드라인 형태. 이는 "구현 단계에서 작성하는 deliverable"이라 의도적.
- 백엔드 사실은 정확한 숫자·코드명 명시.
- 합산 로직(methodology Task 10)은 "backend 코드 확인 후 정확히 기재"로 implementer에게 명시적 위임 — Plan 작성 시점에 이미 main 브랜치에 합산 코드가 있고 큰 변동성 없으나, 정확성 위해 직접 확인 지시.

**3. 타입/이름 일관성**
- TopicChart의 kind enum은 spec과 plan에서 모두 4개 (society/climate/economy/solar).
- noindex prop 이름은 PageHead, AboutIndex, AboutTopic 모두 동일.
- COLORS 상수와 SOURCES 상수의 키는 4개 토픽으로 일치.
