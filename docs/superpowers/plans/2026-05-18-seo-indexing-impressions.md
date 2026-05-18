# SEO 색인·노출 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Earth Doom Index 프론트엔드의 메타데이터·구조화 데이터·내부 링크를 강화해 색인되지 않은 6개 페이지의 크롤 우선순위를 끌어올리고 검색 노출을 늘린다.

**Architecture:** `edi-frontend` (Vite + React 19 + vite-react-ssg) 정적 사전 렌더링 산출물의 `<head>` 와 본문에 들어가는 메타·JSON-LD·앵커를 보강한다. MDX 본문, OG 이미지, 신규 페이지는 비범위.

**Tech Stack:** React 19, vite-react-ssg (Helmet), react-router-dom v6, schema.org JSON-LD, nes.css.

**Spec:** `docs/superpowers/specs/2026-05-18-seo-indexing-impressions-design.md`

---

## File Structure

| 파일 | 책임 | 변경 작업 |
|------|------|----------|
| `edi-frontend/src/seo/jsonLd.js` | schema.org JSON-LD 헬퍼 모음 | Organization 풍부화, WebSite/CollectionPage/ItemList 헬퍼 신규, Article 보강 |
| `edi-frontend/src/seo/PageHead.jsx` | per-page meta 주입 (Helmet) | 변경 없음 (caller에서 jsonLd prop만 다르게 전달) |
| `edi-frontend/src/App.jsx` | 홈 화면 + HomePageHead + HomeIntro | HomePageHead에 WebSite 추가, HomeIntro에 토픽 nav 추가 |
| `edi-frontend/src/routes/AboutIndex.jsx` | About 허브 | en title 보강, CollectionPage/ItemList 스키마 추가 |
| `edi-frontend/src/routes/AboutTopic.jsx` | About 토픽 페이지 | 호출부 변경 없음 (articleJsonLd 내부 보강만) |
| `edi-frontend/src/components/Footer.jsx` | 사이트 푸터 | 토픽 5개 링크 행 추가 |
| `edi-frontend/src/i18n.js` | ko/en UI 문자열 | `home.intro.topicsLabel`, `footer.topicsLabel` 신규 키 추가 |
| `edi-frontend/src/App.css` | 스타일 | `.home-intro-topics`, `.footer-topics` 신규 스타일 |
| `edi-frontend/index.html` | 전역 정적 메타 | `og:site_name`, `og:image:alt` 추가 |

**테스트 인프라:** `edi-frontend`에는 단위 테스트 프레임워크가 설정되어 있지 않다. 검증은 `npm run build` 산출물의 `dist/...` HTML을 `grep`으로 점검하는 방식으로 진행한다.

---

## 사전 준비

- [ ] **Step 0.1: 작업 디렉토리 이동**

```bash
cd /Users/dev/SideProjects/DoomIndex/edi-frontend
```

- [ ] **Step 0.2: 기준 빌드 확인 (옵션, 작업 전 베이스라인 확보)**

```bash
npm run build
```
Expected: 빌드 성공, `dist/ko/index.html`, `dist/en/index.html`, `dist/ko/about/index.html` 등 생성됨.

---

### Task 1: `Organization` JSON-LD 풍부화

**Files:**
- Modify: `edi-frontend/src/seo/jsonLd.js:3-8`

- [ ] **Step 1.1: `ORGANIZATION` 객체에 logo / sameAs 추가**

`edi-frontend/src/seo/jsonLd.js` 의 `ORGANIZATION` 상수를 다음으로 변경:

```js
const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Earth Doom Index',
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  sameAs: [
    'https://github.com/OLLAGANDA/earth-doom-index',
  ],
}
```

- [ ] **Step 1.2: 빌드 후 prerender HTML에 들어갔는지 확인**

```bash
npm run build
grep -o '"sameAs":\["https://github.com/OLLAGANDA[^"]*"\]' dist/ko/index.html dist/en/index.html
```
Expected: 두 파일 모두 매칭 1건 이상.

```bash
grep -o '"logo":"https://www.earthdoomindex.com/favicon.svg"' dist/ko/about/society/index.html
```
Expected: 매칭 1건.

- [ ] **Step 1.3: 커밋**

```bash
git add src/seo/jsonLd.js
git commit -m "feat(seo): enrich Organization JSON-LD with logo and sameAs"
```

---

### Task 2: 홈에 `WebSite` 스키마 추가

**Files:**
- Modify: `edi-frontend/src/seo/jsonLd.js` (append after ORGANIZATION helpers)
- Modify: `edi-frontend/src/App.jsx` (`HomePageHead`, around L422-438)

- [ ] **Step 2.1: `websiteJsonLd(lang)` 헬퍼 추가**

`edi-frontend/src/seo/jsonLd.js` 파일 맨 아래에 추가:

```js
/**
 * WebSite — 사이트 전체를 식별. 홈 페이지에 한 번 게시하고,
 * 다른 페이지는 isPartOf로 @id 참조만 한다.
 */
export function websiteJsonLd(lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: 'Earth Doom Index',
    alternateName: lang === 'ko' ? '지구 멸망 지수' : 'Earth Doom Index',
    inLanguage: lang === 'ko' ? 'ko-KR' : 'en-US',
    publisher: { '@id': `${SITE_URL}/#organization` },
  }
}
```

- [ ] **Step 2.2: `App.jsx`에서 `websiteJsonLd` import 추가**

`edi-frontend/src/App.jsx` 의 L7 (`import { organizationJsonLd } from './seo/jsonLd.js'`)을 다음으로 변경:

```js
import { organizationJsonLd, websiteJsonLd } from './seo/jsonLd.js'
```

- [ ] **Step 2.3: `HomePageHead` 의 `jsonLd` prop 변경**

`edi-frontend/src/App.jsx` 의 `HomePageHead` 컴포넌트(L422-438) 안에서 `jsonLd={organizationJsonLd()}` 부분을 다음으로 변경:

```jsx
jsonLd={[organizationJsonLd(), websiteJsonLd(lang)]}
```

- [ ] **Step 2.4: 빌드 후 WebSite 스키마가 홈에 들어갔는지 확인**

```bash
npm run build
grep -o '"@type":"WebSite"' dist/ko/index.html dist/en/index.html
```
Expected: 두 파일 모두 매칭 1건.

```bash
grep -o '"alternateName":"지구 멸망 지수"' dist/ko/index.html
grep -o '"inLanguage":"en-US"' dist/en/index.html
```
Expected: 각 파일에서 매칭 1건.

- [ ] **Step 2.5: 커밋**

```bash
git add src/seo/jsonLd.js src/App.jsx
git commit -m "feat(seo): add WebSite schema to home page"
```

---

### Task 3: About 허브에 `CollectionPage` + `ItemList` 추가

**Files:**
- Modify: `edi-frontend/src/seo/jsonLd.js` (append)
- Modify: `edi-frontend/src/routes/AboutIndex.jsx`

- [ ] **Step 3.1: `collectionPageJsonLd` 와 `itemListJsonLd` 헬퍼 추가**

`edi-frontend/src/seo/jsonLd.js` 파일 맨 아래에 추가:

```js
/**
 * CollectionPage — About 허브용. 토픽 묶음 페이지임을 명시.
 * hasPart는 자식 Article URL 목록 (참조 형태).
 */
export function collectionPageJsonLd({ name, description, path, lang, hasPartUrls }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: `${SITE_URL}${path}`,
    inLanguage: lang === 'ko' ? 'ko-KR' : 'en-US',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    hasPart: hasPartUrls.map(url => ({
      '@type': 'Article',
      url: `${SITE_URL}${url}`,
    })),
  }
}

/**
 * ItemList — About 허브에서 5개 토픽을 순서·이름·URL로 명시.
 * Google이 "이 5개가 묶음"이라고 이해하도록 cross-indexing 신호를 강화.
 */
export function itemListJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: `${SITE_URL}${item.path}`,
    })),
  }
}
```

- [ ] **Step 3.2: `AboutIndex.jsx`에서 신규 헬퍼 import 추가 및 사용**

`edi-frontend/src/routes/AboutIndex.jsx` 의 L4 (`import { breadcrumbJsonLd, organizationJsonLd } from '../seo/jsonLd.js'`)을 다음으로 변경:

```js
import {
  breadcrumbJsonLd,
  organizationJsonLd,
  collectionPageJsonLd,
  itemListJsonLd,
} from '../seo/jsonLd.js'
```

같은 파일의 L7 `const TOPICS = ['society', 'climate', 'economy', 'solar']` 위(또는 아래)에 추가:

```js
const ALL_TOPICS = ['society', 'climate', 'economy', 'solar', 'methodology']
```

현재 `AboutIndex` 함수 본문은 다음 순서로 변수를 선언한다:
- L12-14: `title`
- L16-19: `breadcrumb`
- L21: `leadParagraphs`
- L22: `metaDescription`
- L24-: `return (...)`

`collection`은 `metaDescription`을 참조하므로, **L22 다음 (L23 빈 줄 위치)** 에 다음 두 변수를 삽입한다:

```js
  const collection = collectionPageJsonLd({
    name: title,
    description: metaDescription,
    path: `/${lang}/about`,
    lang,
    hasPartUrls: ALL_TOPICS.map(topic => `/${lang}/about/${topic}`),
  })

  const itemList = itemListJsonLd(
    ALL_TOPICS.map(topic => ({
      name: a.topicLabels[topic],
      path: `/${lang}/about/${topic}`,
    })),
  )
```

PageHead의 `jsonLd` prop (L33)을 다음으로 변경:

```jsx
jsonLd={[organizationJsonLd(), breadcrumb, collection, itemList]}
```

- [ ] **Step 3.3: 빌드 후 CollectionPage + ItemList가 about 허브에 들어갔는지 확인**

```bash
npm run build
grep -o '"@type":"CollectionPage"' dist/ko/about/index.html dist/en/about/index.html
grep -o '"@type":"ItemList"' dist/ko/about/index.html dist/en/about/index.html
```
Expected: 각 grep이 두 파일에서 매칭 1건씩 (총 2건씩).

```bash
grep -o '"position":5' dist/ko/about/index.html
```
Expected: 매칭 1건 (5개 토픽이 ItemList에 들어갔다는 의미).

```bash
grep -o '"hasPart"' dist/en/about/index.html
```
Expected: 매칭 1건.

- [ ] **Step 3.4: 커밋**

```bash
git add src/seo/jsonLd.js src/routes/AboutIndex.jsx
git commit -m "feat(seo): add CollectionPage and ItemList schemas to about hub"
```

---

### Task 4: `Article` 스키마 보강

**Files:**
- Modify: `edi-frontend/src/seo/jsonLd.js:14-33`

- [ ] **Step 4.1: `articleJsonLd` 보강**

`edi-frontend/src/seo/jsonLd.js` 의 `articleJsonLd` 함수를 다음으로 변경:

```js
/**
 * Article 스키마 — about/{topic} 페이지용.
 *
 * - inLanguage: BCP-47 형식 ('ko-KR' / 'en-US') 으로 정규화.
 * - author/publisher: 풀 객체 대신 Organization @id 참조.
 * - image: 사이트 공통 OG 엔드포인트 (페이지별 분기는 별도 작업).
 * - isPartOf: WebSite 스키마와 연결.
 */
export function articleJsonLd({ title, description, path, datePublished, lang }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    inLanguage: lang === 'ko' ? 'ko-KR' : 'en-US',
    datePublished,
    url: `${SITE_URL}${path}`,
    image: `${SITE_URL}/api/og`,
    author: { '@id': `${SITE_URL}/#organization` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}${path}`,
    },
  }
}
```

호출부 (`AboutTopic.jsx`)는 인자 시그니처가 동일하므로 변경 불필요.

- [ ] **Step 4.2: 빌드 후 Article 스키마 보강 확인**

```bash
npm run build
grep -o '"image":"https://www.earthdoomindex.com/api/og"' dist/ko/about/society/index.html
grep -o '"isPartOf":{"@id":"https://www.earthdoomindex.com/#website"}' dist/en/about/climate/index.html
grep -o '"inLanguage":"ko-KR"' dist/ko/about/economy/index.html
grep -o '"author":{"@id":"https://www.earthdoomindex.com/#organization"}' dist/en/about/solar/index.html
```
Expected: 각 grep이 매칭 1건씩.

- [ ] **Step 4.3: 커밋**

```bash
git add src/seo/jsonLd.js
git commit -m "feat(seo): enrich Article schema with image, isPartOf, BCP-47 inLanguage"
```

---

### Task 5: 메타 보강 — en about title + og 메타

**Files:**
- Modify: `edi-frontend/src/routes/AboutIndex.jsx`
- Modify: `edi-frontend/index.html`

- [ ] **Step 5.1: AboutIndex의 영어 title 보강**

`edi-frontend/src/routes/AboutIndex.jsx` 의 title 분기를 다음으로 변경:

```js
  const title = lang === 'ko'
    ? 'Earth Doom Index 지표 설명 — 4개 위협 지수 측정 방식'
    : 'About Earth Doom Index — How We Measure Society, Climate, Economy, and Solar Threats'
```

- [ ] **Step 5.2: index.html에 og:site_name과 og:image:alt 추가**

`edi-frontend/index.html` 의 og 메타 영역(L12-15 부근, `<meta property="og:image" ... />` 와 `<meta property="og:type" ... />` 사이)에 다음 두 줄 추가:

```html
    <meta property="og:site_name" content="Earth Doom Index" />
    <meta property="og:image:alt" content="Earth Doom Index — daily threat score" />
```

최종적으로 og 메타 블록은 이렇게 보여야 함:

```html
    <meta property="og:image" content="https://www.earthdoomindex.com/api/og" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Earth Doom Index — daily threat score" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Earth Doom Index" />
```

- [ ] **Step 5.3: 빌드 후 메타 확인**

```bash
npm run build
grep -c 'og:site_name' dist/ko/index.html dist/en/index.html dist/ko/about/society/index.html
```
Expected: 각 파일에서 1건씩 (총 3건 출력).

```bash
grep -o 'og:image:alt[^/]*Earth Doom Index — daily threat score' dist/en/about/index.html
```
Expected: 매칭 1건.

```bash
grep -o 'About Earth Doom Index — How We Measure' dist/en/about/index.html
```
Expected: 매칭 1건 (`<title>` 안에).

```bash
grep -o '4개 위협 지수 측정 방식' dist/ko/about/index.html
```
Expected: 매칭 1건 (ko title 그대로 유지 확인).

- [ ] **Step 5.4: 커밋**

```bash
git add src/routes/AboutIndex.jsx index.html
git commit -m "feat(seo): improve en about title and add og:site_name/image:alt"
```

---

### Task 6: HomeIntro에 토픽 4개 직접 링크 추가

**Files:**
- Modify: `edi-frontend/src/i18n.js:14-21` (ko) and `123-130` (en)
- Modify: `edi-frontend/src/App.jsx:443-455` (`HomeIntro` 함수)
- Modify: `edi-frontend/src/App.css:391-422` (home-intro 스타일 블록)

- [ ] **Step 6.1: i18n.js — ko `home.intro`에 `topicsLabel` 키 추가**

`edi-frontend/src/i18n.js` 의 ko `intro` 객체 (L15-20)에서 `aboutLink` 다음에 한 줄 추가:

변경 전:
```js
      intro: {
        title: 'Earth Doom Index',
        lead: '...',
        howTitle: '이 점수는 어떻게 계산되나',
        aboutLink: '종합 산정 방법론 자세히 보기 →',
      },
```

변경 후:
```js
      intro: {
        title: 'Earth Doom Index',
        lead: '...',
        howTitle: '이 점수는 어떻게 계산되나',
        aboutLink: '종합 산정 방법론 자세히 보기 →',
        topicsLabel: '4개 위협 영역',
      },
```

- [ ] **Step 6.2: i18n.js — en `home.intro`에 `topicsLabel` 키 추가**

`edi-frontend/src/i18n.js` 의 en `intro` 객체 (L124-129)에서 `aboutLink` 다음에 한 줄 추가:

```js
      intro: {
        title: 'Earth Doom Index',
        lead: `...`,
        howTitle: 'How the score is calculated',
        aboutLink: 'Read the full methodology →',
        topicsLabel: 'Four threat domains',
      },
```

- [ ] **Step 6.3: App.jsx — `HomeIntro` 컴포넌트에 토픽 nav 추가**

`edi-frontend/src/App.jsx` 의 `HomeIntro` 함수 (L443-455)를 다음으로 변경:

```jsx
function HomeIntro({ lang, t }) {
  const intro = t.home.intro
  const lead = intro.lead.split('\n\n')[0]
  const topicLabels = t.about.topicLabels
  return (
    <section className="home-intro">
      <h1 className="home-intro-title">{intro.title}</h1>
      <p className="home-intro-lead">{lead}</p>
      <nav className="home-intro-topics" aria-label={intro.topicsLabel}>
        <a href={`/${lang}/about/society`}>{topicLabels.society}</a>
        <a href={`/${lang}/about/climate`}>{topicLabels.climate}</a>
        <a href={`/${lang}/about/economy`}>{topicLabels.economy}</a>
        <a href={`/${lang}/about/solar`}>{topicLabels.solar}</a>
      </nav>
      <p className="home-intro-more">
        <a href={`/${lang}/about`}>{intro.aboutLink}</a>
      </p>
    </section>
  )
}
```

- [ ] **Step 6.4: App.css — `.home-intro-topics` 스타일 추가**

`edi-frontend/src/App.css` 의 `.home-intro-more:hover` 블록(L420-422) 다음에 다음 스타일 추가:

```css
.home-intro-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0 0 16px 0;
  font-size: 0.85em;
  line-height: 1.6;
}

.home-intro-topics a {
  color: #92cc41;
  text-decoration: underline;
}

.home-intro-topics a:hover {
  color: #f7d51d;
}
```

- [ ] **Step 6.5: dev 서버에서 시각 점검**

```bash
npm run dev
```
브라우저에서 `http://localhost:5173/ko` 와 `http://localhost:5173/en` 접속.

확인 항목:
- HomeIntro 섹션 안에 4개 토픽 링크 행이 lead 단락 아래, "방법론 자세히 보기" 링크 위에 들어가 있다.
- 모바일 폭(브라우저 너비 375px)에서 wrap 깔끔하게 작동한다.
- 텍스트 색·hover 색이 기존 nes 스킴과 어울린다 (lime green → yellow).

확인 후 Ctrl+C로 dev 서버 종료.

- [ ] **Step 6.6: 빌드 후 토픽 링크가 정적 HTML에 들어갔는지 확인**

```bash
npm run build
grep -c 'href="/ko/about/society"' dist/ko/index.html
grep -c 'href="/ko/about/climate"' dist/ko/index.html
grep -c 'href="/ko/about/economy"' dist/ko/index.html
grep -c 'href="/ko/about/solar"' dist/ko/index.html
```
Expected: 각 grep 결과가 1 이상 (Footer 변경 전이므로 1).

```bash
grep -c 'href="/en/about/society"' dist/en/index.html
```
Expected: 1 이상.

- [ ] **Step 6.7: 커밋**

```bash
git add src/i18n.js src/App.jsx src/App.css
git commit -m "feat(seo): add direct topic links to HomeIntro for bot discovery"
```

---

### Task 7: Footer에 토픽 5개 링크 행 추가

**Files:**
- Modify: `edi-frontend/src/i18n.js` (ko/en 양쪽에 `footer.topicsLabel` 추가)
- Modify: `edi-frontend/src/components/Footer.jsx`
- Modify: `edi-frontend/src/App.css:430-451` (footer-row 블록 부근)

- [ ] **Step 7.1: i18n.js — ko/en 양쪽에 `footer.topicsLabel` 추가**

`edi-frontend/src/i18n.js` 의 구조 기준 라인:
- ko `about:` 객체가 L87-L109에서 끝나고, L110이 ko 블록의 닫는 `},`
- en `about:` 객체가 L196-L218에서 끝나고, L219가 en 블록의 닫는 `},`

ko 블록 끝부분 (L109가 `},`, L110이 `},`)을 다음과 같이 변경:

변경 전:
```js
        methodology: '...',
      },
    },                  // ← L109: about 객체 닫힘
  },                    // ← L110: ko 블록 닫힘
```

변경 후:
```js
        methodology: '...',
      },
    },                  // ← about 객체 닫힘
    footer: {
      topicsLabel: '토픽:',
    },
  },                    // ← ko 블록 닫힘
```

en 블록 끝부분 (L218이 `},`, L219가 `},`)도 동일하게 처리:

```js
        methodology: 'How the four indices combine into a 0–100 score',
      },
    },                  // ← about 객체 닫힘
    footer: {
      topicsLabel: 'Topics:',
    },
  },                    // ← en 블록 닫힘
```

`footer`는 `home`, `cards`, `about`와 같은 깊이 (lang 객체의 직접 자식)에 있어야 한다.

- [ ] **Step 7.2: Footer.jsx — 토픽 5개 링크 행 추가**

`edi-frontend/src/components/Footer.jsx` 전체를 다음으로 교체:

```jsx
import { Link } from 'react-router-dom'

const FOOTER_TOPIC_KEYS = ['society', 'climate', 'economy', 'solar', 'methodology']

export default function Footer({ lang, t, onShowTerms }) {
  const topicLabels = t.about.topicLabels
  const topicsLabel = t.footer?.topicsLabel ?? 'Topics:'
  return (
    <footer className="site-footer">
      <div className="footer-row footer-topics">
        <span className="footer-topics-label">{topicsLabel}</span>
        {FOOTER_TOPIC_KEYS.map(key => (
          <Link key={key} to={`/${lang}/about/${key}`} className="footer-link footer-topic-link">
            {topicLabels[key]}
          </Link>
        ))}
      </div>
      <div className="footer-row">
        <a
          href="https://github.com/OLLAGANDA/earth-doom-index"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          GITHUB
        </a>
        <span className="footer-sep">|</span>
        <Link to={`/${lang}/about`} className="footer-link">
          {t.about.navLabel}
        </Link>
        <span className="footer-sep">|</span>
        <span>© 2026 EARTH DOOM INDEX</span>
        <span className="footer-sep">|</span>
        <button className="terms-btn" onClick={onShowTerms}>{t.terms}</button>
        <span className="footer-sep">|</span>
        <a href="mailto:dev782108@gmail.com" className="footer-link">CONTACT</a>
      </div>
    </footer>
  )
}
```

- [ ] **Step 7.3: App.css — `.footer-topics` 스타일 추가**

`edi-frontend/src/App.css` 의 `.footer-sep` 블록(L449-451) 다음에 다음을 추가:

```css
.footer-topics {
  font-size: 8px;
  color: #555;
  margin-bottom: 6px;
  gap: 10px;
}

.footer-topics-label {
  color: #888;
  letter-spacing: 1px;
}

.footer-topic-link {
  color: #e76e55;
}

.footer-topic-link:hover {
  color: #ff9980;
}
```

- [ ] **Step 7.4: dev 서버에서 시각 점검**

```bash
npm run dev
```
브라우저에서 `http://localhost:5173/ko`, `http://localhost:5173/en`, `http://localhost:5173/ko/about`, `http://localhost:5173/ko/about/society` 등 여러 페이지 점검.

확인 항목:
- Footer가 두 줄로 표시된다 (위: Topics 5개, 아래: 기존 GitHub/About/©/Terms/Contact).
- 모바일 폭에서 두 행 모두 wrap이 자연스럽다.
- 위 행 글자 크기·색이 아래 행보다 살짝 가볍지만 일관된 느낌.
- 클릭 시 해당 about/{topic} 페이지로 이동.

확인 후 Ctrl+C로 dev 종료.

- [ ] **Step 7.5: 빌드 후 모든 페이지 footer에 토픽 5개 링크 들어갔는지 확인**

```bash
npm run build

# 홈에 5개 토픽 + HomeIntro의 4개 = 9개 매칭 예상 (society/climate/economy/solar는 ×2, methodology는 ×1)
grep -c 'href="/ko/about/methodology"' dist/ko/index.html
```
Expected: 1 (Footer 5개 중 1개; HomeIntro에는 methodology 없음).

```bash
grep -c 'href="/ko/about/society"' dist/ko/index.html
```
Expected: 2 (HomeIntro 1 + Footer 1).

```bash
# About 토픽 페이지의 footer에도 5개 들어갔는지
grep -c 'footer-topic-link' dist/ko/about/society/index.html
```
Expected: 5.

```bash
grep -c 'footer-topic-link' dist/en/about/economy/index.html
```
Expected: 5.

- [ ] **Step 7.6: 커밋**

```bash
git add src/i18n.js src/components/Footer.jsx src/App.css
git commit -m "feat(seo): add topics row to footer for site-wide topic discovery"
```

---

### Task 8: 통합 빌드 검증

**Files:** 변경 없음 — 검증만.

- [ ] **Step 8.1: 클린 빌드**

```bash
rm -rf dist
npm run build
```
Expected: 빌드 성공, 에러 없음.

- [ ] **Step 8.2: 전체 스키마 매트릭스 검증**

홈 페이지 (ko/en):
```bash
grep -o '"@type":"Organization"' dist/ko/index.html | wc -l
grep -o '"@type":"WebSite"' dist/ko/index.html | wc -l
grep -o '"@type":"Organization"' dist/en/index.html | wc -l
grep -o '"@type":"WebSite"' dist/en/index.html | wc -l
```
Expected: 모두 1.

About 허브 (ko/en):
```bash
for f in dist/ko/about/index.html dist/en/about/index.html; do
  echo "=== $f ==="
  grep -o '"@type":"Organization"' "$f" | wc -l
  grep -o '"@type":"BreadcrumbList"' "$f" | wc -l
  grep -o '"@type":"CollectionPage"' "$f" | wc -l
  grep -o '"@type":"ItemList"' "$f" | wc -l
done
```
Expected: 각 파일에서 4개 스키마 모두 1.

About 토픽 (전체 5개 × 2언어 = 10개 파일):
```bash
for topic in society climate economy solar methodology; do
  for lang in ko en; do
    f="dist/$lang/about/$topic/index.html"
    echo "=== $f ==="
    grep -o '"@type":"Article"' "$f" | wc -l
    grep -o '"image":"https://www.earthdoomindex.com/api/og"' "$f" | wc -l
    grep -o '"isPartOf":{"@id":"https://www.earthdoomindex.com/#website"}' "$f" | wc -l
  done
done
```
Expected: 각 파일에서 3개 매칭 모두 1.

- [ ] **Step 8.3: 내부 링크 매트릭스 검증**

```bash
# 홈에서 토픽 링크 합계 점검 (HomeIntro 4 + Footer 5 = 9)
echo "ko home topic links:"
for topic in society climate economy solar; do
  echo "  $topic: $(grep -c "href=\"/ko/about/$topic\"" dist/ko/index.html)"
done
echo "  methodology: $(grep -c "href=\"/ko/about/methodology\"" dist/ko/index.html)"

echo "en home topic links:"
for topic in society climate economy solar; do
  echo "  $topic: $(grep -c "href=\"/en/about/$topic\"" dist/en/index.html)"
done
echo "  methodology: $(grep -c "href=\"/en/about/methodology\"" dist/en/index.html)"
```
Expected:
- society, climate, economy, solar: 각 2 (HomeIntro 1 + Footer 1)
- methodology: 1 (Footer만)

```bash
# About 토픽 페이지의 footer 토픽 링크 점검
for topic in society climate economy solar methodology; do
  f="dist/ko/about/$topic/index.html"
  echo "$f: $(grep -c 'footer-topic-link' "$f")"
done
```
Expected: 각 파일 5.

- [ ] **Step 8.4: og 메타 매트릭스 검증**

```bash
for f in dist/ko/index.html dist/en/index.html dist/ko/about/index.html dist/en/about/society/index.html; do
  echo "=== $f ==="
  grep -c 'og:site_name' "$f"
  grep -c 'og:image:alt' "$f"
  grep -c 'og:image"' "$f"
  grep -c 'canonical' "$f"
done
```
Expected: 각 파일에서 모두 1 이상.

- [ ] **Step 8.5: 시각적 회귀 점검 (dev)**

```bash
npm run dev
```

브라우저에서 다음 페이지를 순회하며 깨진 화면 없는지 확인:
- `http://localhost:5173/ko` (홈 ko)
- `http://localhost:5173/en` (홈 en)
- `http://localhost:5173/ko/about` (about 허브 ko)
- `http://localhost:5173/en/about` (about 허브 en)
- `http://localhost:5173/ko/about/society` (about 토픽 ko)
- `http://localhost:5173/en/about/methodology` (about 토픽 en)

각 페이지에서:
- 데스크탑 폭에서 레이아웃 정상
- 모바일 폭(375px)에서 wrap 정상
- HomeIntro 토픽 nav, Footer 토픽 행 모두 보이고 클릭 시 정상 이동
- 콘솔 에러 없음

확인 후 Ctrl+C로 종료.

- [ ] **Step 8.6: Lint 점검**

```bash
npm run lint
```
Expected: 에러 0, 경고는 기존 수준 이상으로 추가되지 않음.

- [ ] **Step 8.7: 사후 모니터링 작업 메모 (커밋 불요)**

다음 항목은 배포 후 사용자가 직접 확인:
- 빌드 산출물 1~2개 URL을 Google [Rich Results Test](https://search.google.com/test/rich-results)에 넣어 스키마 파싱 에러 없는지 확인
- GSC 색인 커버리지 보고서: 1~3주 후 미색인 페이지 6개의 상태 변화 확인
- GSC 검색 실적: 노출(impressions) 추세 확인

---

## Self-Review 체크리스트

(이 섹션은 작업자가 모든 Task 완료 후 자체 점검)

- [ ] Spec의 변경 영역 ① (메타) 항목 1.1, 1.2, 1.3이 모두 Task 5에 반영되었는가?
- [ ] Spec의 변경 영역 ② (구조화) 항목 2.1~2.4가 Task 1, 2, 3, 4에 반영되었는가?
- [ ] Spec의 변경 영역 ③ (내부 링크) 항목 3.1~3.2가 Task 6, 7에 반영되었는가?
- [ ] Spec의 비범위 항목(MDX 본문 변경, OG 분기, 신규 페이지, FAQ/Dataset 스키마)이 plan에도 추가되지 않았는가?
- [ ] 빌드 검증 grep이 의도한 매칭 수와 일치하는가?
- [ ] dev 서버 시각 점검을 통과했는가?
