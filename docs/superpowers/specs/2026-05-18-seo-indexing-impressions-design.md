# SEO 색인·노출 개선 (메타·구조화 데이터·내부 링크)

- **작성일**: 2026-05-18
- **대상**: `edi-frontend`

## 배경

2026-05-18 기준 Google Search Console 색인 커버리지 데이터에서 다음이 확인됨.

- 사이트맵 14개 URL 중 색인 8개 / 미색인 8개 (그 중 `NOINDEX`로 명시 제외 2개, "발견됐지만 색인 보류" 6개)
- 일일 노출 수가 0~3건 수준으로 낮음
- 색인 진척률이 2026-05-12부터 8/8에서 정체

원인 추정:

- 홈에서 about/{topic} 으로 가는 봇 경로가 2-hop (홈 → about 허브 → 토픽)
- 토픽 페이지가 사이트 권위 신호를 약하게 받음 → Googlebot이 크롤 우선순위를 낮춤
- 영어 about 허브 타이틀이 짧고 일반적 (`"About — Earth Doom Index Methodology"`)
- 구조화 데이터가 페이지당 2~3종으로 최소한
- 일부 OG/사이트 메타 누락 (`og:site_name`, `og:image:alt`)

## 목표

- 색인되지 않은 6개 페이지의 크롤 우선순위를 끌어올린다.
- 이미 색인된 8개 페이지의 검색 노출/순위 신호를 강화한다.
- MDX 본문·OG 이미지·신규 페이지는 비범위.

## 비범위 (이번 작업에서 안 하는 것)

- MDX 본문 변경 (FAQ 절 추가, 키워드 자연 삽입, inline cross-link)
- OG 이미지 페이지별 분기
- 신규 페이지 추가 (글로서리, FAQ, 일자별 아카이브 등)
- 사이트맵에 신규 URL 추가
- `LangPicker` (`/`) noindex 정책 변경 (의도된 동작)
- 키워드 stuffing, `<meta name="keywords">` 신규 추가

## 변경 영역 ①: 메타 튜닝

### 변경 1.1 — About 허브 영어 메타 보강

**파일**: `src/routes/AboutIndex.jsx`

영어 타이틀이 짧고 검색 의도 매칭이 약함. ko 톤과 균형 맞추도록 보강.

```js
// 변경 전 (en)
title = 'About — Earth Doom Index Methodology'

// 변경 후 (en)
title = 'About Earth Doom Index — How We Measure Society, Climate, Economy, and Solar Threats'
```

`metaDescription`은 현재 i18n의 `a.indexLead` 첫 단락을 사용 중. ko/en 둘 다 키워드가 풍부함 (en은 ~600자로 SERP에서 truncate되지만 내용은 충분). 이번 스코프에서는 그대로 유지. 짧은 전용 description은 별도 작업으로 검토 가능.

ko 타이틀은 변경하지 않음 (이미 검색 의도 매칭됨).

### 변경 1.2 — `og:site_name`, `og:image:alt` 추가

**파일**: `index.html`

OG 메타에 site_name과 image alt가 누락되어 있음. 사이트 전체 공통이므로 `index.html`에 1회 추가.

```html
<meta property="og:site_name" content="Earth Doom Index" />
<meta property="og:image:alt" content="Earth Doom Index — daily threat score" />
```

`og:image:alt`는 언어별 분기가 필요한지 검토 가능. 작업량 대비 효과가 작아 정적 문자열 1회만 두는 쪽으로.

### 변경 1.3 — 점검만 (변경 없음)

- 홈 (`/{lang}`) 의 title/description: 이미 검색 의도 매칭됨. 변경 없음.
- About 토픽 (`/{lang}/about/{topic}`) 의 MDX frontmatter title/description: 이미 좋음. 변경 없음.
- `LangPicker` (`/`): noindex이므로 메타 튜닝 무의미. 변경 없음.

## 변경 영역 ②: 구조화 데이터 보강

### 현재 상태

| 페이지 | 현재 스키마 |
|--------|--------------|
| 홈 (`/{lang}`) | Organization |
| About 허브 (`/{lang}/about`) | Organization + BreadcrumbList |
| About 토픽 (`/{lang}/about/{topic}`) | Organization + BreadcrumbList + Article |

### 변경 2.1 — `Organization` 풍부화

**파일**: `src/seo/jsonLd.js`

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

`description`은 lang별로 다르므로 `organizationJsonLd(lang)` 함수를 lang을 받도록 변경하거나, 본문 없이도 의미가 통하면 생략. 우선 lang 인자 없이 logo + sameAs만 추가. description은 작업 중 필요하면 추가.

### 변경 2.2 — 홈에 `WebSite` 스키마 추가

**파일**: `src/seo/jsonLd.js`, `src/App.jsx` (`HomePageHead`)

새 헬퍼 `websiteJsonLd(lang)` 추가.

```js
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

홈 `HomePageHead`에서 `jsonLd` prop을 `[organizationJsonLd(), websiteJsonLd(lang)]` 로 변경.

`SearchAction`은 사이트 검색이 없으므로 제외.

### 변경 2.3 — About 허브에 `CollectionPage` + `ItemList` 추가

**파일**: `src/seo/jsonLd.js`, `src/routes/AboutIndex.jsx`

새 헬퍼 2개:

```js
export function collectionPageJsonLd({ name, description, path, lang, hasPartUrls }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: `${SITE_URL}${path}`,
    inLanguage: lang === 'ko' ? 'ko-KR' : 'en-US',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    hasPart: hasPartUrls.map(url => ({ '@type': 'Article', url: `${SITE_URL}${url}` })),
  }
}

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

`AboutIndex` 에서 호출:

```js
const ALL_TOPICS = ['society', 'climate', 'economy', 'solar', 'methodology']
const itemList = itemListJsonLd(
  ALL_TOPICS.map(topic => ({
    name: a.topicLabels[topic],
    path: `/${lang}/about/${topic}`,
  }))
)
const collection = collectionPageJsonLd({
  name: title,
  description: metaDescription,
  path: `/${lang}/about`,
  lang,
  hasPartUrls: ALL_TOPICS.map(topic => `/${lang}/about/${topic}`),
})

jsonLd={[organizationJsonLd(), breadcrumb, collection, itemList]}
```

### 변경 2.4 — About 토픽 `Article`에 `image`, `isPartOf` 추가

**파일**: `src/seo/jsonLd.js`

```js
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

- `image`: 현재 사이트 공통 OG. 페이지별 OG 분기는 비범위.
- `inLanguage`: `'ko'`/`'en'` 같은 짧은 코드보다 `'ko-KR'`/`'en-US'` BCP-47 형식이 표준. 정정.
- `author`/`publisher`: 풀 객체 대신 `@id` 참조로 정규화.
- `isPartOf`: WebSite 스키마와 연결.

### 페이지별 스키마 적용 후

| 페이지 | 적용 후 스키마 |
|--------|---------------------|
| 홈 | Organization(풍부화) + WebSite |
| About 허브 | Organization(풍부화) + BreadcrumbList + CollectionPage + ItemList |
| About 토픽 | Organization(풍부화) + BreadcrumbList + Article(image/isPartOf 추가) |

### 안 추가하는 스키마

- `FAQPage` / `HowTo`: 본문에 실제 콘텐츠가 없으면 정책 위반 (⑤가 비범위라 본문 보강 못함)
- `Dataset`: 매일 갱신되는 점수에 정당하게 적용 가능하지만 distribution/license/temporalCoverage 등 필드 설계 부담이 커서 비범위
- 홈에 `BreadcrumbList`: 최상위 페이지에는 불필요

## 변경 영역 ③: 내부 링크 강화

### 현재 상태

| 영역 | 봇이 보는 about/{topic} 링크 |
|------|-------|
| TopNav | 없음 |
| Footer | 없음 (about 허브 1개만) |
| HomeIntro | 없음 (about 허브 1개만) |
| About 허브 | 5개 토픽 카드 (양호) |
| About 토픽 | 본문 끝 CrossLinks 4개 (양호) |
| 스코어 카드 모달 | 1개 (모달은 prerender 시 DOM에 없음 — 봇이 못 봄) |

### 변경 3.1 — HomeIntro에 토픽 4개 직접 링크 추가

**파일**: `src/App.jsx`, `src/i18n.js`, `src/App.css`

`HomeIntro` 컴포넌트에 토픽 4개(society / climate / economy / solar) 직접 링크를 추가. methodology는 메타 페이지 성격이라 홈에서는 제외하고 about 허브에 맡김 (기존 패턴 유지).

```jsx
function HomeIntro({ lang, t }) {
  const intro = t.home.intro
  const lead = intro.lead.split('\n\n')[0]
  const topicLabels = t.about.topicLabels  // 기존에 있음
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

`i18n.js` `home.intro` 객체에 `topicsLabel` 키 추가 (aria-label 용):
- ko: `'4개 위협 영역'`
- en: `'Four threat domains'`

`App.css`에 `.home-intro-topics` 스타일 추가 — 기존 nes 톤 유지. 가로 인라인 (4개라 짧음), 모바일에서는 자동 wrap. 색상은 기존 nes accent.

### 변경 3.2 — Footer에 토픽 5개 링크 추가

**파일**: `src/components/Footer.jsx`, `src/App.css`

기존 한 줄 footer 위에 작은 "Topics:" 한 줄을 추가. 5개 모두 포함 (methodology 포함).

```jsx
const FOOTER_TOPICS = [
  { key: 'society',    href: (l) => `/${l}/about/society` },
  { key: 'climate',    href: (l) => `/${l}/about/climate` },
  { key: 'economy',    href: (l) => `/${l}/about/economy` },
  { key: 'solar',      href: (l) => `/${l}/about/solar` },
  { key: 'methodology',href: (l) => `/${l}/about/methodology` },
]

export default function Footer({ lang, t, onShowTerms }) {
  const labels = t.about.topicLabels
  return (
    <footer className="site-footer">
      <div className="footer-row footer-topics">
        <span className="footer-label">{t.footer?.topicsLabel ?? 'Topics:'}</span>
        {FOOTER_TOPICS.map(({ key, href }) => (
          <Link key={key} to={href(lang)} className="footer-link">
            {labels[key]}
          </Link>
        ))}
      </div>
      <div className="footer-row">
        {/* 기존 GitHub / About / © / Terms / Contact 그대로 */}
      </div>
    </footer>
  )
}
```

`i18n.js`에 `t.footer.topicsLabel` 키 추가 (ko: `'토픽:'`, en: `'Topics:'`).

`App.css`에 `.footer-topics` 스타일 추가 — 작은 글씨, wrap 허용, 모바일에서 깨지지 않게.

### 변경 3.3 — 변경 없음

- TopNav: 모바일에서 좁은 공간 + 두 번째 행 추가 시 nes 톤 깨질 우려. 위 3.1·3.2로 발견성 확보.
- About 허브 본문에 inline link 추가: ⑤ 영역
- CrossLinks 컴포넌트 위치/구조 변경: ⑤ 영역
- 스코어 카드 모달을 prerender에 노출: UX 복잡, score-card 자체가 클라이언트 데이터 의존

### 효과 (예상)

- 홈 → about/{topic} 경로가 2-hop → **1-hop**
- 모든 페이지(홈·about 허브·about 토픽)에서 모든 토픽으로 footer를 통해 **1-hop**
- 색인 미생성 6개 페이지의 크롤 우선순위 신호 강화

## 영향 받는 파일 (요약)

| 파일 | 변경 내용 |
|------|-----------|
| `src/routes/AboutIndex.jsx` | en title 보강, CollectionPage + ItemList 스키마 추가 |
| `src/routes/AboutTopic.jsx` | 호출부 변경 없음 (articleJsonLd 헬퍼 내부에서 image/isPartOf 자동 주입) |
| `src/seo/jsonLd.js` | Organization 풍부화, websiteJsonLd / collectionPageJsonLd / itemListJsonLd 신규, articleJsonLd 보강 |
| `src/App.jsx` | HomePageHead에 WebSite 스키마 추가, HomeIntro에 토픽 4개 링크 추가 |
| `src/components/Footer.jsx` | 토픽 5개 링크 행 추가 |
| `src/App.css` | `.home-intro-topics`, `.footer-topics` 스타일 추가 |
| `src/i18n.js` | `home.intro.topicsLabel`, `footer.topicsLabel` 키 추가 (ko/en) |
| `index.html` | `og:site_name`, `og:image:alt` 추가 |

## 검증

### 빌드 후 정적 산출물 확인

```bash
cd edi-frontend
npm run build

# 메타 확인
grep -l "og:site_name" dist/ko/index.html dist/en/index.html dist/ko/about/index.html

# JSON-LD 확인
grep -o '"@type":"WebSite"' dist/ko/index.html dist/en/index.html
grep -o '"@type":"CollectionPage"' dist/ko/about/index.html dist/en/about/index.html
grep -o '"@type":"ItemList"' dist/ko/about/index.html dist/en/about/index.html
grep -o '"image"' dist/ko/about/society/index.html

# 내부 링크 확인 (홈에 토픽 4개 직접 링크)
grep -E 'href="/ko/about/(society|climate|economy|solar)"' dist/ko/index.html | wc -l
# 기대: 5 (HomeIntro 4 + Footer 5 중 4개 + HomeIntro 의 about 허브 1개 — 정확한 개수는 빌드 후 측정해서 확인)

# 내부 링크 확인 (모든 페이지 footer에 토픽 5개)
grep -c 'class="footer-link"' dist/ko/about/society/index.html
```

### 수동 점검

- dev server에서 홈 / about 허브 / about 토픽 페이지의 모바일/데스크탑 시각 점검 (footer 깨지지 않는지, HomeIntro nav가 자연스러운지)
- 빌드 산출물 1개를 Google [Rich Results Test](https://search.google.com/test/rich-results) 에 넣어 스키마 파싱 에러 없는지 확인 (배포 후 수동)

### 사후 모니터링 (배포 후 며칠~몇 주)

- GSC 색인 커버리지: 미색인 6개가 색인되는지
- GSC 노출: 일일 노출 수 증가 추세
- Rich Results 보고서: 새 스키마(WebSite, CollectionPage, ItemList)가 파싱 에러 없이 인식되는지

## 위험·트레이드오프

- **본문은 안 건드리는 보수적 작업이라 효과는 점진적**: 색인 페이지 수가 즉시 16 → 14 (미색인 0) 되지는 않음. GSC가 결과에 반영되기까지 보통 1~3주.
- **Footer 두 번째 행 추가**: 시각적으로 footer가 약간 두꺼워짐. 모바일에서 wrap이 깔끔하지 않으면 톤이 어색해질 수 있음 → 빌드 전 dev에서 확인 필수.
- **JSON-LD 사이즈 증가**: prerender HTML 사이즈가 페이지당 약 1~3KB 증가. 무시 가능한 수준.
- **`inLanguage` 형식 변경 (`ko` → `ko-KR`)**: 기존 Article 스키마에서 단축 코드를 쓰던 경로가 있다면 일관성 위해 모두 BCP-47로 정정.
