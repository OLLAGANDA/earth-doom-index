# Explainer Pages Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Earth Doom Index 프론트엔드에 prerender 가능한 라우팅·MDX 콘텐츠 인프라를 구축하고, 모든 진입 경로(상단 네비, 카드 모달, 푸터, 메인 explainer 섹션)를 placeholder /about 페이지에 연결한다.

**Architecture:** React + Vite SPA에 `react-router-dom`과 `vite-react-ssg`를 도입해 빌드 시점에 15개 정적 HTML을 생성한다. MDX(`@mdx-js/rollup`)로 콘텐츠를 작성하고, `App.jsx`에서 `TopNav`/`Footer`를 분리해 `/about/*` 페이지에서 재사용한다. 모든 페이지에 페이지별 `<title>`/`<meta>`/canonical/hreflang/JSON-LD를 주입한다.

**Tech Stack:** React 19, Vite 8, react-router-dom v6, vite-react-ssg, @mdx-js/rollup, @mdx-js/react, nes.css (기존), recharts (기존)

**Spec:** `docs/superpowers/specs/2026-04-26-explainer-pages-design.md`

**Notes for executor:**
- 모든 파일 경로는 저장소 루트(`/Users/dev/SideProjects/DoomIndex/`) 기준이지만 명령은 `edi-frontend/` 안에서 실행한다고 가정한다.
- 자동 테스트는 도입하지 않는다(스펙 비목표). 검증은 `vite build` 성공 + `dist/` HTML grep + 브라우저 수동 체크다.
- 모든 task 끝에 커밋한다.

---

## File Structure

**신규 파일**:
```
edi-frontend/src/routes.jsx                      # 라우트 테이블 (vite-react-ssg가 import)
edi-frontend/src/routes/Home.jsx                 # /{lang} — App.jsx 래퍼
edi-frontend/src/routes/LangPicker.jsx           # / — 정적 언어 선택 페이지
edi-frontend/src/routes/AboutLayout.jsx          # /{lang}/about/* 공통 레이아웃
edi-frontend/src/routes/AboutIndex.jsx           # /{lang}/about — 허브
edi-frontend/src/routes/AboutTopic.jsx           # /{lang}/about/:topic — MDX 렌더
edi-frontend/src/components/TopNav.jsx           # App.jsx에서 분리 + about 메뉴 추가
edi-frontend/src/components/Footer.jsx           # App.jsx에서 분리 + about 링크 추가
edi-frontend/src/components/AboutCard.jsx        # 허브용 카드
edi-frontend/src/components/TopicChart.jsx       # placeholder div
edi-frontend/src/components/CrossLinks.jsx       # 페이지 하단 관련 링크
edi-frontend/src/seo/PageHead.jsx                # 페이지 메타 주입
edi-frontend/src/seo/jsonLd.js                   # JSON-LD 빌더
edi-frontend/src/content/ko/{society,climate,economy,solar,methodology}.mdx
edi-frontend/src/content/en/{society,climate,economy,solar,methodology}.mdx
```

**수정 파일**:
```
edi-frontend/package.json                # 의존성 추가, scripts 변경
edi-frontend/vite.config.js              # MDX 플러그인 추가
edi-frontend/src/main.jsx                # ViteReactSSG 진입점으로 변경
edi-frontend/src/App.jsx                 # lang prop 받도록 + TopNav/Footer 추출 후
edi-frontend/src/i18n.js                 # about/* 키 추가
edi-frontend/index.html                  # 기본 메타만 남기고 페이지별 메타는 PageHead가 처리
edi-frontend/vercel.json                 # rewrite 정정
edi-frontend/public/sitemap.xml          # 14개 신규 URL
```

---

## Task 1: 의존성 설치

**Files:**
- Modify: `edi-frontend/package.json`

- [ ] **Step 1: 의존성 추가 명령 실행**

```bash
cd edi-frontend
npm install react-router-dom vite-react-ssg @mdx-js/rollup @mdx-js/react gray-matter
```

`gray-matter`는 MDX frontmatter 파싱용.

- [ ] **Step 2: package.json 확인**

`dependencies`에 `react-router-dom`, `vite-react-ssg`, `@mdx-js/rollup`, `@mdx-js/react`, `gray-matter` 5개가 추가됐는지 확인한다.

- [ ] **Step 3: build 명령 변경**

`edi-frontend/package.json`의 `scripts.build`를 다음으로 수정:

```json
"build": "vite-react-ssg build",
"build:spa": "vite build"
```

`build:spa`는 디버깅용 fallback (SSG 문제 발생 시 SPA-only 빌드 가능).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(frontend): add react-router, MDX, vite-react-ssg deps"
```

---

## Task 2: Vite + MDX 플러그인 설정

**Files:**
- Modify: `edi-frontend/vite.config.js`

- [ ] **Step 1: vite.config.js 수정**

기존 파일을 다음으로 교체:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'

export default defineConfig({
  plugins: [
    { enforce: 'pre', ...mdx({ providerImportSource: '@mdx-js/react' }) },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
```

핵심: MDX 플러그인을 react 플러그인보다 먼저(`enforce: 'pre'`) 적용해야 MDX 파일이 JSX로 변환된 뒤 react 플러그인이 처리한다.

- [ ] **Step 2: dev 서버 기동 확인**

```bash
npm run dev
```

기존 메인 페이지(`/`)가 정상 렌더되는지 브라우저(`http://localhost:5173`)에서 확인. 변경 사항은 아직 없으므로 동일하게 동작해야 함.

- [ ] **Step 3: Commit**

```bash
git add vite.config.js
git commit -m "chore(frontend): configure vite for MDX"
```

---

## Task 3: App.jsx에서 TopNav 분리

**Files:**
- Create: `edi-frontend/src/components/TopNav.jsx`
- Modify: `edi-frontend/src/App.jsx`

이 task는 **순수 리팩터** — 동작 변경 없이 코드 위치만 옮긴다. about 메뉴 추가는 별도 task에서.

- [ ] **Step 1: components 디렉터리 생성**

```bash
mkdir -p edi-frontend/src/components
```

- [ ] **Step 2: TopNav.jsx 생성**

`edi-frontend/src/components/TopNav.jsx` 신규 작성:

```jsx
export default function TopNav({ lang, onToggle }) {
  return (
    <nav className="top-nav">
      <span className="nav-brand">
        EARTH DOOM INDEX
      </span>
      <button className="lang-toggle" onClick={onToggle}>
        <span className={lang === 'ko' ? 'nes-text is-primary' : ''}>KO</span>
        {' / '}
        <span className={lang === 'en' ? 'nes-text is-primary' : ''}>EN</span>
      </button>
    </nav>
  )
}
```

원본은 `edi-frontend/src/App.jsx:427-440`에 있던 함수 그대로 옮긴다.

- [ ] **Step 3: App.jsx에서 TopNav 함수 정의 제거 + import 추가**

`edi-frontend/src/App.jsx`:

```jsx
// 파일 상단 import 영역에 추가
import TopNav from './components/TopNav.jsx'
```

그리고 `function TopNav({ lang, onToggle }) { ... }` 함수 정의(`App.jsx:427-440`)를 **완전히 삭제**한다. 사용처(`<TopNav lang={lang} onToggle={toggle} />`)는 그대로 유지.

- [ ] **Step 4: dev 서버에서 동작 확인**

```bash
npm run dev
```

브라우저에서 메인 페이지 상단 네비가 그대로 보이고, 언어 토글이 정상 작동하는지 확인.

- [ ] **Step 5: Commit**

```bash
git add src/components/TopNav.jsx src/App.jsx
git commit -m "refactor(frontend): extract TopNav into components/"
```

---

## Task 4: App.jsx에서 Footer 분리

**Files:**
- Create: `edi-frontend/src/components/Footer.jsx`
- Modify: `edi-frontend/src/App.jsx`

- [ ] **Step 1: Footer.jsx 생성**

`edi-frontend/src/components/Footer.jsx` 신규 작성:

```jsx
export default function Footer({ t, onShowTerms }) {
  return (
    <footer className="site-footer">
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

`t`는 i18n 번역 객체, `onShowTerms`는 약관 모달 토글 콜백.

- [ ] **Step 2: App.jsx에서 푸터 영역 교체**

`App.jsx`의 푸터 JSX 블록(`<footer className="site-footer"> ... </footer>`, 약 `App.jsx:607-624`)을 다음으로 교체:

```jsx
<Footer t={t} onShowTerms={() => setShowTerms(true)} />
```

그리고 파일 상단에 import 추가:

```jsx
import Footer from './components/Footer.jsx'
```

- [ ] **Step 3: dev 서버 확인**

```bash
npm run dev
```

푸터가 정상 보이고 약관 버튼 클릭 시 모달이 열리는지 확인.

- [ ] **Step 4: Commit**

```bash
git add src/components/Footer.jsx src/App.jsx
git commit -m "refactor(frontend): extract Footer into components/"
```

---

## Task 5: App.jsx를 lang prop 받도록 변경

**Files:**
- Modify: `edi-frontend/src/App.jsx`

기존 `App`은 `useLang` 훅으로 자체적으로 언어 상태를 관리했다. 라우터 도입 후엔 URL이 진실 소스이므로 `lang`을 prop으로 받게 변경한다.

- [ ] **Step 1: useLang 훅 제거 및 prop 시그니처 변경**

`App.jsx`의 `function App() { ... }`를 다음과 같이 변경:

기존:
```jsx
function App() {
  const { data, loading, error } = useDoomData()
  const historyData = useDoomHistory()
  const { lang, toggle } = useLang()
  const t = translations[lang]
  // ...
```

변경 후:
```jsx
function App({ lang, onToggleLang }) {
  const { data, loading, error } = useDoomData()
  const historyData = useDoomHistory()
  const t = translations[lang]
  // ...
```

기존 `<TopNav lang={lang} onToggle={toggle} />`는 다음으로 변경:
```jsx
<TopNav lang={lang} onToggle={onToggleLang} />
```

- [ ] **Step 2: useLang 함수 정의 제거**

`App.jsx`의 `function useLang() { ... }` 정의(약 `App.jsx:89-101`)를 **완전히 삭제**한다. localStorage 처리 로직은 Task 6의 `Home.jsx` 래퍼에서 다시 등장한다.

- [ ] **Step 3: build 검증 (아직 라우팅 없으므로 컴파일 에러 확인용)**

```bash
npm run build:spa
```

이 단계에서 `App`이 prop을 받게 됐지만 `main.jsx`가 prop 없이 호출하므로 lang이 undefined가 된다. 빌드는 성공하지만 runtime에서 깨진다. 다음 task에서 router 진입점을 만든다. 이 단계 빌드 성공만 확인.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "refactor(frontend): App accepts lang prop instead of internal hook"
```

---

## Task 6: Home 래퍼 + main.jsx를 ViteReactSSG로 전환

**Files:**
- Create: `edi-frontend/src/routes/Home.jsx`
- Create: `edi-frontend/src/routes.jsx`
- Modify: `edi-frontend/src/main.jsx`

- [ ] **Step 1: routes 디렉터리 생성**

```bash
mkdir -p edi-frontend/src/routes
```

- [ ] **Step 2: Home.jsx 작성**

`edi-frontend/src/routes/Home.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import App from '../App.jsx'

const VALID_LANGS = ['ko', 'en']

export default function Home({ lang }) {
  const navigate = useNavigate()
  const [currentLang, setCurrentLang] = useState(lang)

  useEffect(() => {
    if (VALID_LANGS.includes(lang)) {
      localStorage.setItem('edi-lang', lang)
      setCurrentLang(lang)
    }
  }, [lang])

  const onToggleLang = () => {
    const next = currentLang === 'ko' ? 'en' : 'ko'
    localStorage.setItem('edi-lang', next)
    navigate(`/${next}`)
  }

  return <App lang={currentLang} onToggleLang={onToggleLang} />
}
```

- [ ] **Step 3: routes.jsx 작성**

`edi-frontend/src/routes.jsx`:

```jsx
import Home from './routes/Home.jsx'

export const routes = [
  { path: '/ko', element: <Home lang="ko" /> },
  { path: '/en', element: <Home lang="en" /> },
]
```

다른 라우트들은 후속 task에서 추가한다. 이번 단계는 메인 페이지가 라우터로 동작하는 것까지.

- [ ] **Step 4: main.jsx를 ViteReactSSG로 변경**

`edi-frontend/src/main.jsx` 전체 교체:

```jsx
import { ViteReactSSG } from 'vite-react-ssg'
import 'nes.css/css/nes.min.css'
import './index.css'
import { routes } from './routes.jsx'

export const createRoot = ViteReactSSG({ routes })
```

`StrictMode`는 vite-react-ssg가 내부에서 처리하므로 제거.

- [ ] **Step 5: dev 서버 확인**

```bash
npm run dev
```

`/ko`, `/en`로 접속해 메인 페이지가 정상 보이고 언어 토글이 URL을 전환하는지 확인. `/`는 아직 정의 안 했으므로 404 또는 빈 화면이 정상.

- [ ] **Step 6: Commit**

```bash
git add src/routes/ src/routes.jsx src/main.jsx
git commit -m "feat(frontend): mount react-router with /ko, /en routes"
```

---

## Task 7: LangPicker (`/`)

**Files:**
- Create: `edi-frontend/src/routes/LangPicker.jsx`
- Modify: `edi-frontend/src/routes.jsx`

- [ ] **Step 1: LangPicker.jsx 작성**

`edi-frontend/src/routes/LangPicker.jsx`:

```jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function detectLang() {
  if (typeof window === 'undefined') return 'en'
  const saved = localStorage.getItem('edi-lang')
  if (saved === 'ko' || saved === 'en') return saved
  return navigator.language?.startsWith('ko') ? 'ko' : 'en'
}

export default function LangPicker() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(`/${detectLang()}`, { replace: true })
  }, [navigate])

  // 정적 prerender 시 봇이 보는 본문: 양 언어 링크 (검색 발견용)
  return (
    <div className="lang-picker">
      <h1>Earth Doom Index</h1>
      <p>Choose your language / 언어를 선택하세요</p>
      <ul>
        <li><a href="/ko">한국어</a></li>
        <li><a href="/en">English</a></li>
      </ul>
    </div>
  )
}
```

핵심: prerender 시 SSR에서 `useEffect`는 실행되지 않으므로 본문 JSX(양 언어 링크)가 정적 HTML에 박힌다. 클라이언트 하이드레이션 후 즉시 리다이렉트.

- [ ] **Step 2: routes.jsx에 / 추가**

`edi-frontend/src/routes.jsx` 수정:

```jsx
import Home from './routes/Home.jsx'
import LangPicker from './routes/LangPicker.jsx'

export const routes = [
  { path: '/', element: <LangPicker /> },
  { path: '/ko', element: <Home lang="ko" /> },
  { path: '/en', element: <Home lang="en" /> },
]
```

- [ ] **Step 3: 동작 확인**

```bash
npm run dev
```

`/`로 접속 시 즉시 `/ko` 또는 `/en`로 이동되는지 확인 (브라우저 언어에 따라). localStorage에 `edi-lang`이 한 번이라도 저장돼 있으면 그것 우선.

- [ ] **Step 4: Commit**

```bash
git add src/routes/LangPicker.jsx src/routes.jsx
git commit -m "feat(frontend): add LangPicker at / with auto-redirect"
```

---

## Task 8: AboutLayout + AboutIndex 골격

**Files:**
- Create: `edi-frontend/src/routes/AboutLayout.jsx`
- Create: `edi-frontend/src/routes/AboutIndex.jsx`
- Modify: `edi-frontend/src/routes.jsx`

이번 task는 layout과 hub 페이지 **골격만** 만든다. AboutCard, MDX 콘텐츠는 후속.

- [ ] **Step 1: AboutLayout.jsx 작성**

`edi-frontend/src/routes/AboutLayout.jsx`:

```jsx
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import TopNav from '../components/TopNav.jsx'
import Footer from '../components/Footer.jsx'
import { translations } from '../i18n.js'

const VALID_LANGS = ['ko', 'en']

export default function AboutLayout() {
  const { lang: paramLang } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [showTerms, setShowTerms] = useState(false)

  const lang = VALID_LANGS.includes(paramLang) ? paramLang : 'ko'
  const t = translations[lang]

  useEffect(() => {
    localStorage.setItem('edi-lang', lang)
  }, [lang])

  const onToggleLang = () => {
    const next = lang === 'ko' ? 'en' : 'ko'
    localStorage.setItem('edi-lang', next)
    // 현재 경로에서 /ko/... 를 /en/... 로 (또는 반대) 치환
    const newPath = location.pathname.replace(`/${lang}/`, `/${next}/`)
    navigate(newPath)
  }

  return (
    <>
      <TopNav lang={lang} onToggle={onToggleLang} />
      <div className="about-screen">
        <Outlet context={{ lang, t }} />
      </div>
      <Footer t={t} onShowTerms={() => setShowTerms(true)} />
      {showTerms && (
        <div className="modal-overlay" onClick={() => setShowTerms(false)}>
          <div className="modal-box nes-container is-dark" onClick={e => e.stopPropagation()}>
            <p className="title">{t.terms}</p>
            <div className="modal-content">
              {t.termsContent.map((line, i) => <p key={i}>{line}</p>)}
            </div>
            <button className="nes-btn is-error modal-close" onClick={() => setShowTerms(false)}>{t.termsClose}</button>
          </div>
        </div>
      )}
    </>
  )
}
```

`useOutletContext`로 자식 라우트에 lang/t를 전달.

- [ ] **Step 2: AboutIndex.jsx 작성 (골격)**

`edi-frontend/src/routes/AboutIndex.jsx`:

```jsx
import { useOutletContext } from 'react-router-dom'

export default function AboutIndex() {
  const { lang, t } = useOutletContext()

  return (
    <main className="about-index">
      <h1>{lang === 'ko' ? '지표 설명' : 'About the Indices'}</h1>
      <p>
        {lang === 'ko'
          ? 'Earth Doom Index는 4개 영역의 위협 신호를 종합한 지표입니다. 각 영역의 측정 방식과 데이터 출처를 자세히 알아보세요.'
          : 'Earth Doom Index combines threat signals from four domains. Explore how each is measured and sourced.'}
      </p>
      {/* AboutCard는 Task 13에서 추가 */}
    </main>
  )
}
```

- [ ] **Step 3: routes.jsx에 about 라우트 추가**

`edi-frontend/src/routes.jsx`:

```jsx
import Home from './routes/Home.jsx'
import LangPicker from './routes/LangPicker.jsx'
import AboutLayout from './routes/AboutLayout.jsx'
import AboutIndex from './routes/AboutIndex.jsx'

export const routes = [
  { path: '/', element: <LangPicker /> },
  { path: '/ko', element: <Home lang="ko" /> },
  { path: '/en', element: <Home lang="en" /> },
  {
    path: '/:lang/about',
    element: <AboutLayout />,
    children: [
      { index: true, element: <AboutIndex /> },
    ],
  },
]
```

- [ ] **Step 4: 동작 확인**

```bash
npm run dev
```

`/ko/about`, `/en/about` 접속 시 헤더+허브 텍스트+푸터가 보이고, 언어 토글이 URL을 전환하는지 확인.

- [ ] **Step 5: Commit**

```bash
git add src/routes/AboutLayout.jsx src/routes/AboutIndex.jsx src/routes.jsx
git commit -m "feat(frontend): add /:lang/about layout and index skeleton"
```

---

## Task 9: AboutTopic + 동적 MDX 로딩

**Files:**
- Create: `edi-frontend/src/routes/AboutTopic.jsx`
- Modify: `edi-frontend/src/routes.jsx`

- [ ] **Step 1: AboutTopic.jsx 작성**

`edi-frontend/src/routes/AboutTopic.jsx`:

```jsx
import { useOutletContext, useParams, Navigate } from 'react-router-dom'
import { lazy, Suspense, useMemo } from 'react'

const VALID_TOPICS = ['society', 'climate', 'economy', 'solar', 'methodology']

// MDX 파일을 동적 import — Vite가 빌드 시점에 코드 스플리팅
const mdxModules = import.meta.glob('../content/*/*.mdx')

function loadMdx(lang, topic) {
  const path = `../content/${lang}/${topic}.mdx`
  const loader = mdxModules[path]
  if (!loader) return null
  return lazy(() => loader())
}

export default function AboutTopic() {
  const { lang, t } = useOutletContext()
  const { topic } = useParams()

  if (!VALID_TOPICS.includes(topic)) {
    return <Navigate to={`/${lang}/about`} replace />
  }

  const MdxComponent = useMemo(() => loadMdx(lang, topic), [lang, topic])

  if (!MdxComponent) {
    return <Navigate to={`/${lang}/about`} replace />
  }

  return (
    <main className="about-topic">
      <nav className="breadcrumb">
        <a href={`/${lang}`}>{lang === 'ko' ? '홈' : 'Home'}</a>
        {' > '}
        <a href={`/${lang}/about`}>{lang === 'ko' ? '지표 설명' : 'About'}</a>
        {' > '}
        <span>{topic}</span>
      </nav>
      <Suspense fallback={<p>Loading...</p>}>
        <MdxComponent />
      </Suspense>
    </main>
  )
}
```

- [ ] **Step 2: routes.jsx에 토픽 라우트 추가**

`children` 배열에 추가:

```jsx
import AboutTopic from './routes/AboutTopic.jsx'

// ... 기존 routes의 about 부분
{
  path: '/:lang/about',
  element: <AboutLayout />,
  children: [
    { index: true, element: <AboutIndex /> },
    { path: ':topic', element: <AboutTopic /> },
  ],
},
```

- [ ] **Step 3: 임시 MDX 파일 1개 작성 (Task 12에서 모두 채우기 전 동작 확인용)**

```bash
mkdir -p edi-frontend/src/content/ko edi-frontend/src/content/en
```

`edi-frontend/src/content/ko/society.mdx` 임시:

```mdx
# 사회 위협 지수

이 페이지는 준비 중입니다.
```

- [ ] **Step 4: 동작 확인**

```bash
npm run dev
```

`/ko/about/society` 접속 시 breadcrumb + "사회 위협 지수" + "이 페이지는 준비 중입니다." 가 보이는지 확인.
`/ko/about/invalid` 접속 시 `/ko/about`로 리다이렉트되는지 확인.

- [ ] **Step 5: Commit**

```bash
git add src/routes/AboutTopic.jsx src/routes.jsx src/content/ko/society.mdx
git commit -m "feat(frontend): add /:lang/about/:topic dynamic MDX loading"
```

---

## Task 10: PageHead 컴포넌트

**Files:**
- Create: `edi-frontend/src/seo/PageHead.jsx`

- [ ] **Step 1: seo 디렉터리 생성**

```bash
mkdir -p edi-frontend/src/seo
```

- [ ] **Step 2: PageHead.jsx 작성**

`edi-frontend/src/seo/PageHead.jsx`:

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
 */
export default function PageHead({ title, description, path, koPath, enPath, jsonLd }) {
  useEffect(() => {
    if (title) document.title = title

    setMeta('description', description)
    setMeta('og:title', title, 'property')
    setMeta('og:description', description, 'property')
    setMeta('og:url', `${SITE_URL}${path}`, 'property')
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)

    setLink('canonical', `${SITE_URL}${path}`)
    setLink('alternate', `${SITE_URL}${koPath ?? path}`, 'ko')
    setLink('alternate', `${SITE_URL}${enPath ?? path}`, 'en')
    setLink('alternate', `${SITE_URL}${enPath ?? path}`, 'x-default')

    // JSON-LD
    const existingJsonLd = document.head.querySelector('script[data-page-jsonld]')
    if (existingJsonLd) existingJsonLd.remove()
    if (jsonLd) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute('data-page-jsonld', 'true')
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }
  }, [title, description, path, koPath, enPath, jsonLd])

  // SSG 시점에는 useEffect가 안 돌므로, prerender HTML에 박히도록 정적 fallback 렌더
  // vite-react-ssg는 SSR 시 document가 없으므로 head 조작 대신 React 19의 native head support 사용
  return (
    <>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={`${SITE_URL}${path}`} />
      <link rel="alternate" hrefLang="ko" href={`${SITE_URL}${koPath ?? path}`} />
      <link rel="alternate" hrefLang="en" href={`${SITE_URL}${enPath ?? path}`} />
      <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${enPath ?? path}`} />
      {jsonLd && (
        <script
          type="application/ld+json"
          data-page-jsonld="true"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </>
  )
}
```

핵심: React 19의 native head 지원으로 `<title>`, `<meta>`, `<link>`를 컴포넌트 트리에 직접 둘 수 있다. SSG 시 prerender HTML에 박히고, 클라이언트 라우팅 시 `useEffect`가 보강한다.

- [ ] **Step 3: AboutIndex에 적용 (단일 페이지에서 동작 확인)**

`edi-frontend/src/routes/AboutIndex.jsx` 수정:

```jsx
import { useOutletContext } from 'react-router-dom'
import PageHead from '../seo/PageHead.jsx'

export default function AboutIndex() {
  const { lang } = useOutletContext()

  const title = lang === 'ko'
    ? 'Earth Doom Index 지표 설명'
    : 'About — Earth Doom Index'
  const description = lang === 'ko'
    ? '사회·기후·경제·태양 4개 영역의 위협 지수 측정 방식과 데이터 출처를 자세히 알아보세요.'
    : 'How the four threat indices of Earth Doom Index (society, climate, economy, solar) are measured and sourced.'

  return (
    <>
      <PageHead
        title={title}
        description={description}
        path={`/${lang}/about`}
        koPath="/ko/about"
        enPath="/en/about"
      />
      <main className="about-index">
        <h1>{lang === 'ko' ? '지표 설명' : 'About the Indices'}</h1>
        <p>{description}</p>
      </main>
    </>
  )
}
```

- [ ] **Step 4: 동작 확인**

```bash
npm run dev
```

`/ko/about`, `/en/about` 접속 후 브라우저 개발자도구 → Elements → `<head>`에서 `<title>`, `<meta name="description">`, `<link rel="canonical">`, `<link rel="alternate" hreflang="...">`가 페이지별로 다른지 확인.

- [ ] **Step 5: Commit**

```bash
git add src/seo/PageHead.jsx src/routes/AboutIndex.jsx
git commit -m "feat(frontend): add PageHead component for per-page SEO meta"
```

---

## Task 11: jsonLd 빌더

**Files:**
- Create: `edi-frontend/src/seo/jsonLd.js`

- [ ] **Step 1: jsonLd.js 작성**

`edi-frontend/src/seo/jsonLd.js`:

```javascript
const SITE_URL = 'https://www.earthdoomindex.com'

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Earth Doom Index',
  url: SITE_URL,
}

export function organizationJsonLd() {
  return { '@context': 'https://schema.org', ...ORGANIZATION }
}

/**
 * Article 스키마 — about/{topic} 페이지용.
 */
export function articleJsonLd({ title, description, path, datePublished, lang }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    inLanguage: lang,
    datePublished,
    url: `${SITE_URL}${path}`,
    author: ORGANIZATION,
    publisher: ORGANIZATION,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}${path}`,
    },
  }
}

/**
 * BreadcrumbList — about 페이지용.
 *
 * @param items - [{ name, path }, ...] 순서대로 (홈 → 부모 → 현재)
 */
export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}
```

- [ ] **Step 2: AboutIndex에 적용**

`edi-frontend/src/routes/AboutIndex.jsx`의 `PageHead` 호출에 `jsonLd` 추가:

```jsx
import { breadcrumbJsonLd, organizationJsonLd } from '../seo/jsonLd.js'

// ... AboutIndex 내부
const breadcrumb = breadcrumbJsonLd([
  { name: lang === 'ko' ? '홈' : 'Home', path: `/${lang}` },
  { name: lang === 'ko' ? '지표 설명' : 'About', path: `/${lang}/about` },
])

return (
  <>
    <PageHead
      title={title}
      description={description}
      path={`/${lang}/about`}
      koPath="/ko/about"
      enPath="/en/about"
      jsonLd={[organizationJsonLd(), breadcrumb]}
    />
    {/* ... */}
  </>
)
```

`jsonLd`가 배열이면 `PageHead`가 각각 처리해야 한다. PageHead.jsx의 JSX 부분 수정:

```jsx
{jsonLd && (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((data, i) => (
  <script
    key={i}
    type="application/ld+json"
    data-page-jsonld="true"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
  />
))}
```

PageHead의 `useEffect` 부분도 배열 처리하도록 수정:

```jsx
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
```

- [ ] **Step 3: 동작 확인**

```bash
npm run dev
```

`/ko/about`에서 개발자도구 → Elements → `<head>`에 `<script type="application/ld+json">` 두 개(Organization, BreadcrumbList)가 있는지 확인. JSON 내용도 검증.

- [ ] **Step 4: Commit**

```bash
git add src/seo/jsonLd.js src/seo/PageHead.jsx src/routes/AboutIndex.jsx
git commit -m "feat(frontend): add JSON-LD builders (Article, Breadcrumb, Organization)"
```

---

## Task 12: TopicChart placeholder + CrossLinks + AboutCard

**Files:**
- Create: `edi-frontend/src/components/TopicChart.jsx`
- Create: `edi-frontend/src/components/CrossLinks.jsx`
- Create: `edi-frontend/src/components/AboutCard.jsx`

세 개 모두 단순 컴포넌트이므로 한 task에 묶는다.

- [ ] **Step 1: TopicChart.jsx 작성 (placeholder)**

`edi-frontend/src/components/TopicChart.jsx`:

```jsx
/**
 * 토픽별 추세 차트 placeholder.
 *
 * Phase 1에선 안내 박스만 표시한다. Phase 2에서 recharts로 실 차트 구현 예정.
 *
 * @param kind - 'society' | 'climate' | 'economy' | 'solar'
 * @param days - 표시할 기간 (현재 미사용, Phase 2 구현 시 활용)
 */
export default function TopicChart({ kind, days = 30 }) {
  return (
    <div className="topic-chart-placeholder nes-container is-dark">
      <p>📊 {kind.toUpperCase()} 최근 {days}일 추세 차트가 여기에 표시됩니다.</p>
      <p className="sub-text">Phase 2에서 구현 예정.</p>
    </div>
  )
}
```

- [ ] **Step 2: CrossLinks.jsx 작성**

`edi-frontend/src/components/CrossLinks.jsx`:

```jsx
const TOPIC_LABELS = {
  ko: {
    society: '🏙 사회 위협 지수',
    climate: '🌡 기후 위협 지수',
    economy: '📈 경제 위협 지수',
    solar: '☀ 태양 위협 지수',
    methodology: '📐 종합 산정 방법론',
  },
  en: {
    society: '🏙 Society Threat Index',
    climate: '🌡 Climate Threat Index',
    economy: '📈 Economy Threat Index',
    solar: '☀ Solar Threat Index',
    methodology: '📐 Methodology',
  },
}

const ALL_TOPICS = ['society', 'climate', 'economy', 'solar', 'methodology']

/**
 * 페이지 하단 "관련 토픽" 블록.
 * 현재 토픽을 제외한 나머지 4개를 링크로 표시.
 */
export default function CrossLinks({ current, lang }) {
  const others = ALL_TOPICS.filter(t => t !== current)
  const labels = TOPIC_LABELS[lang] ?? TOPIC_LABELS.ko
  const sectionTitle = lang === 'ko' ? '관련 토픽' : 'Related Topics'

  return (
    <section className="cross-links nes-container is-dark with-title">
      <p className="title">{sectionTitle}</p>
      <ul>
        {others.map(t => (
          <li key={t}>
            <a href={`/${lang}/about/${t}`}>{labels[t]} →</a>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 3: AboutCard.jsx 작성**

`edi-frontend/src/components/AboutCard.jsx`:

```jsx
/**
 * 허브 페이지(/{lang}/about)의 토픽 카드.
 *
 * 메인 페이지 점수 카드와 시각적 일관성을 위해 nes-container 사용.
 */
export default function AboutCard({ lang, topic, label, description }) {
  return (
    <a href={`/${lang}/about/${topic}`} className="about-card nes-container is-dark with-title">
      <p className="title">{label}</p>
      <p className="about-card-desc">{description}</p>
      <p className="about-card-cta">
        {lang === 'ko' ? '자세히 알아보기 →' : 'Learn more →'}
      </p>
    </a>
  )
}
```

- [ ] **Step 4: 빌드 확인**

```bash
npm run dev
```

dev 서버가 에러 없이 기동되는지만 확인. 컴포넌트는 후속 task에서 사용처에 연결.

- [ ] **Step 5: Commit**

```bash
git add src/components/TopicChart.jsx src/components/CrossLinks.jsx src/components/AboutCard.jsx
git commit -m "feat(frontend): add TopicChart placeholder, CrossLinks, AboutCard"
```

---

## Task 13: i18n.js에 about 관련 키 추가

**Files:**
- Modify: `edi-frontend/src/i18n.js`

- [ ] **Step 1: ko 객체에 키 추가**

`edi-frontend/src/i18n.js`의 `ko: { ... }` 안에 다음 키들 추가 (적당한 위치, 예: `cards` 다음):

```javascript
about: {
  navLabel: '지표 설명',
  navMethodology: '방법론',
  indexTitle: '지표 설명',
  indexLead: 'Earth Doom Index는 4개 영역의 위협 신호를 종합한 지표입니다. 각 영역의 측정 방식과 데이터 출처를 자세히 알아보세요.',
  learnMore: '자세히 알아보기 →',
  breadcrumbHome: '홈',
  breadcrumbAbout: '지표 설명',
  topicLabels: {
    society: '🏙 사회 위협 지수',
    climate: '🌡 기후 위협 지수',
    economy: '📈 경제 위협 지수',
    solar: '☀ 태양 위협 지수',
    methodology: '📐 종합 산정 방법론',
  },
  topicShortDesc: {
    society: 'GDELT 뉴스 데이터 기반 시위·분쟁·무력 충돌 측정',
    climate: 'OpenWeather 기반 극단 기상 위협 측정',
    economy: 'Yahoo Finance 기반 경기·시장 위험 측정',
    solar: 'NOAA SWPC 기반 태양 활동·지자기 폭풍 측정',
    methodology: '4개 지수 종합 및 0~100 점수 산정 방식',
  },
  mainExplainerTitle: '이 점수는 어떻게 계산되나요?',
  mainExplainerLead: 'DOOM-9000은 4개 영역의 위협을 종합합니다.',
  mainExplainerCta: '전체 산정 방법론 자세히 보기 →',
},
```

- [ ] **Step 2: en 객체에 동일 구조로 추가**

```javascript
about: {
  navLabel: 'About',
  navMethodology: 'Methodology',
  indexTitle: 'About the Indices',
  indexLead: 'Earth Doom Index combines threat signals from four domains. Explore how each is measured and sourced.',
  learnMore: 'Learn more →',
  breadcrumbHome: 'Home',
  breadcrumbAbout: 'About',
  topicLabels: {
    society: '🏙 Society Threat Index',
    climate: '🌡 Climate Threat Index',
    economy: '📈 Economy Threat Index',
    solar: '☀ Solar Threat Index',
    methodology: '📐 Methodology',
  },
  topicShortDesc: {
    society: 'Protests, conflicts, and armed violence — based on GDELT news events',
    climate: 'Extreme weather threats — based on OpenWeather data',
    economy: 'Recession and market instability — based on Yahoo Finance',
    solar: 'Solar activity and geomagnetic storms — based on NOAA SWPC',
    methodology: 'How the four indices combine into a 0–100 score',
  },
  mainExplainerTitle: 'How is this score calculated?',
  mainExplainerLead: 'DOOM-9000 combines threats from four domains.',
  mainExplainerCta: 'Read full methodology →',
},
```

- [ ] **Step 3: dev 서버 확인**

```bash
npm run dev
```

문법 에러 없이 기동되는지 확인.

- [ ] **Step 4: Commit**

```bash
git add src/i18n.js
git commit -m "feat(frontend): add i18n keys for about pages and main explainer"
```

---

## Task 14: AboutIndex에 AboutCard 5개 표시

**Files:**
- Modify: `edi-frontend/src/routes/AboutIndex.jsx`

- [ ] **Step 1: AboutIndex.jsx 전체 교체**

`edi-frontend/src/routes/AboutIndex.jsx`:

```jsx
import { useOutletContext } from 'react-router-dom'
import PageHead from '../seo/PageHead.jsx'
import AboutCard from '../components/AboutCard.jsx'
import { breadcrumbJsonLd, organizationJsonLd } from '../seo/jsonLd.js'

const TOPICS = ['society', 'climate', 'economy', 'solar']

export default function AboutIndex() {
  const { lang, t } = useOutletContext()
  const a = t.about

  const title = lang === 'ko'
    ? 'Earth Doom Index 지표 설명 — 4개 위협 지수 측정 방식'
    : 'About — Earth Doom Index Methodology'

  const breadcrumb = breadcrumbJsonLd([
    { name: a.breadcrumbHome, path: `/${lang}` },
    { name: a.breadcrumbAbout, path: `/${lang}/about` },
  ])

  return (
    <>
      <PageHead
        title={title}
        description={a.indexLead}
        path={`/${lang}/about`}
        koPath="/ko/about"
        enPath="/en/about"
        jsonLd={[organizationJsonLd(), breadcrumb]}
      />
      <main className="about-index">
        <h1>{a.indexTitle}</h1>
        <p className="about-lead">{a.indexLead}</p>
        <div className="about-cards">
          {TOPICS.map(topic => (
            <AboutCard
              key={topic}
              lang={lang}
              topic={topic}
              label={a.topicLabels[topic]}
              description={a.topicShortDesc[topic]}
            />
          ))}
        </div>
        <div className="about-methodology">
          <AboutCard
            lang={lang}
            topic="methodology"
            label={a.topicLabels.methodology}
            description={a.topicShortDesc.methodology}
          />
        </div>
      </main>
    </>
  )
}
```

- [ ] **Step 2: 동작 확인**

```bash
npm run dev
```

`/ko/about`에서 5개 카드(4개 토픽 + methodology)가 보이고, 각 카드 클릭 시 토픽 페이지로 이동하는지 확인. 토픽 페이지는 아직 임시 society.mdx만 있어 다른 토픽은 about 인덱스로 리다이렉트될 수 있음 (정상).

- [ ] **Step 3: Commit**

```bash
git add src/routes/AboutIndex.jsx
git commit -m "feat(frontend): render 5 about cards on hub page"
```

---

## Task 15: MDX placeholder 콘텐츠 10개 작성

**Files:**
- Create: `edi-frontend/src/content/ko/society.mdx` (덮어씀)
- Create: `edi-frontend/src/content/ko/climate.mdx`
- Create: `edi-frontend/src/content/ko/economy.mdx`
- Create: `edi-frontend/src/content/ko/solar.mdx`
- Create: `edi-frontend/src/content/ko/methodology.mdx`
- Create: `edi-frontend/src/content/en/society.mdx`
- Create: `edi-frontend/src/content/en/climate.mdx`
- Create: `edi-frontend/src/content/en/economy.mdx`
- Create: `edi-frontend/src/content/en/solar.mdx`
- Create: `edi-frontend/src/content/en/methodology.mdx`

각 파일은 frontmatter + 안내문 + TopicChart + CrossLinks 구조. Phase 2에서 본문이 채워질 자리.

- [ ] **Step 1: ko/society.mdx**

`edi-frontend/src/content/ko/society.mdx`:

```mdx
---
title: "사회 위협 지수란? — GDELT 기반 글로벌 갈등 측정 | Earth Doom Index"
description: "Earth Doom Index의 사회 위협 지수가 무엇이고, GDELT와 CAMEO 코드로 어떻게 0~30점으로 환산되는지 설명합니다."
keywords: ["GDELT", "CAMEO 코드", "사회 갈등 지수", "지정학 위험"]
publishedAt: "2026-04-26"
---

import TopicChart from '../../components/TopicChart.jsx'
import CrossLinks from '../../components/CrossLinks.jsx'

# 사회 위협 지수란?

본 페이지는 준비 중입니다.

이 지수는 **GDELT(Global Database of Events, Language, and Tone)** 뉴스 이벤트 데이터를 기반으로 전 세계 시위·분쟁·무력 충돌의 빈도와 강도를 0~30점으로 환산한 지표입니다. CAMEO 코드 분류를 활용해 사건 유형별로 가중치를 적용하고, NumMentions(언론 노출량)으로 강도를 보정합니다.

상세 설명은 곧 공개됩니다.

<TopicChart kind="society" days={30} />

<CrossLinks current="society" lang="ko" />
```

- [ ] **Step 2: ko/climate.mdx**

```mdx
---
title: "기후 위협 지수란? — OpenWeather 기반 극단 기상 측정 | Earth Doom Index"
description: "Earth Doom Index의 기후 위협 지수가 어떤 데이터와 방식으로 0~30점으로 환산되는지 설명합니다."
keywords: ["기후 위기 지수", "극단 기상 측정", "OpenWeather"]
publishedAt: "2026-04-26"
---

import TopicChart from '../../components/TopicChart.jsx'
import CrossLinks from '../../components/CrossLinks.jsx'

# 기후 위협 지수란?

본 페이지는 준비 중입니다.

이 지수는 **OpenWeather API**를 기반으로 극단적 기상 현상, 이상 기온, 폭풍 등의 위협 수준을 측정해 0~30점으로 환산한 지표입니다.

상세 설명은 곧 공개됩니다.

<TopicChart kind="climate" days={30} />

<CrossLinks current="climate" lang="ko" />
```

- [ ] **Step 3: ko/economy.mdx**

```mdx
---
title: "경제 위협 지수란? — 글로벌 금융 시장 위험 측정 | Earth Doom Index"
description: "Earth Doom Index의 경제 위협 지수가 어떤 시장 지표로 0~30점으로 환산되는지 설명합니다."
keywords: ["경제 위협 지수", "경기 침체 지수", "시장 위험"]
publishedAt: "2026-04-26"
---

import TopicChart from '../../components/TopicChart.jsx'
import CrossLinks from '../../components/CrossLinks.jsx'

# 경제 위협 지수란?

본 페이지는 준비 중입니다.

이 지수는 **Yahoo Finance API**의 글로벌 금융 시장 지표를 기반으로 경기 침체, 시장 불안정성, 인플레이션 위험을 측정해 0~30점으로 환산한 지표입니다.

상세 설명은 곧 공개됩니다.

<TopicChart kind="economy" days={30} />

<CrossLinks current="economy" lang="ko" />
```

- [ ] **Step 4: ko/solar.mdx**

```mdx
---
title: "태양 위협 지수란? — 우주 기상 위협 측정 | Earth Doom Index"
description: "Earth Doom Index의 태양 위협 지수가 NOAA SWPC 데이터로 0~10점으로 어떻게 환산되는지 설명합니다."
keywords: ["태양 흑점", "지자기 폭풍", "우주 기상", "NOAA SWPC"]
publishedAt: "2026-04-26"
---

import TopicChart from '../../components/TopicChart.jsx'
import CrossLinks from '../../components/CrossLinks.jsx'

# 태양 위협 지수란?

본 페이지는 준비 중입니다.

이 지수는 **NOAA Space Weather Prediction Center**의 태양 흑점 활동 및 지자기 폭풍 데이터를 기반으로 우주 기상이 지구에 미치는 위협을 0~10점으로 환산한 지표입니다.

상세 설명은 곧 공개됩니다.

<TopicChart kind="solar" days={30} />

<CrossLinks current="solar" lang="ko" />
```

- [ ] **Step 5: ko/methodology.mdx**

```mdx
---
title: "Earth Doom Index 종합 산정 방법론"
description: "4개 영역의 위협 지수가 어떻게 종합되어 0~100점의 멸망 지수가 되는지 설명합니다."
keywords: ["doom index methodology", "위협 지수 산정", "지구 위험도 측정"]
publishedAt: "2026-04-26"
---

import CrossLinks from '../../components/CrossLinks.jsx'

# Earth Doom Index 종합 산정 방법론

본 페이지는 준비 중입니다.

Earth Doom Index는 사회(0~30), 기후(0~30), 경제(0~30), 태양(0~10) 4개 영역 점수를 합산해 0~100점의 종합 멸망 지수를 산출합니다. 각 영역별 산정 방식은 해당 페이지에서 확인할 수 있습니다.

상세 알고리즘과 가중치 정당화는 곧 공개됩니다.

<CrossLinks current="methodology" lang="ko" />
```

- [ ] **Step 6: en/society.mdx**

```mdx
---
title: "Society Threat Index — How GDELT Measures Global Conflict | Earth Doom Index"
description: "How the Society Threat Index of Earth Doom Index converts GDELT and CAMEO event data into a 0–30 score."
keywords: ["GDELT", "CAMEO codes", "social conflict index", "geopolitical risk"]
publishedAt: "2026-04-26"
---

import TopicChart from '../../components/TopicChart.jsx'
import CrossLinks from '../../components/CrossLinks.jsx'

# Society Threat Index

This page is under construction.

The Society Threat Index is built from **GDELT (Global Database of Events, Language, and Tone)** news event data. It measures the frequency and intensity of protests, disputes, and armed conflicts worldwide, converting them into a 0–30 score using CAMEO event-type weights and a NumMentions-based intensity factor.

A detailed explanation is coming soon.

<TopicChart kind="society" days={30} />

<CrossLinks current="society" lang="en" />
```

- [ ] **Step 7: en/climate.mdx**

```mdx
---
title: "Climate Threat Index — Measuring Extreme Weather | Earth Doom Index"
description: "How the Climate Threat Index of Earth Doom Index uses OpenWeather data to score extreme weather events on a 0–30 scale."
keywords: ["climate risk index", "extreme weather index", "OpenWeather"]
publishedAt: "2026-04-26"
---

import TopicChart from '../../components/TopicChart.jsx'
import CrossLinks from '../../components/CrossLinks.jsx'

# Climate Threat Index

This page is under construction.

The Climate Threat Index uses the **OpenWeather API** to measure extreme weather events, temperature anomalies, and storms, converting them into a 0–30 score.

A detailed explanation is coming soon.

<TopicChart kind="climate" days={30} />

<CrossLinks current="climate" lang="en" />
```

- [ ] **Step 8: en/economy.mdx**

```mdx
---
title: "Economy Threat Index — Tracking Market Risk | Earth Doom Index"
description: "How the Economy Threat Index of Earth Doom Index uses global market data to score recession and instability risks on a 0–30 scale."
keywords: ["economic threat index", "recession index", "market risk"]
publishedAt: "2026-04-26"
---

import TopicChart from '../../components/TopicChart.jsx'
import CrossLinks from '../../components/CrossLinks.jsx'

# Economy Threat Index

This page is under construction.

The Economy Threat Index uses **Yahoo Finance API** market indicators to measure recession risk, market instability, and inflation pressure, converting them into a 0–30 score.

A detailed explanation is coming soon.

<TopicChart kind="economy" days={30} />

<CrossLinks current="economy" lang="en" />
```

- [ ] **Step 9: en/solar.mdx**

```mdx
---
title: "Solar Threat Index — Space Weather and Earth | Earth Doom Index"
description: "How the Solar Threat Index of Earth Doom Index uses NOAA SWPC data to score space weather threats on a 0–10 scale."
keywords: ["sunspot activity", "geomagnetic storm", "space weather", "NOAA SWPC"]
publishedAt: "2026-04-26"
---

import TopicChart from '../../components/TopicChart.jsx'
import CrossLinks from '../../components/CrossLinks.jsx'

# Solar Threat Index

This page is under construction.

The Solar Threat Index uses **NOAA Space Weather Prediction Center** data on sunspot activity and geomagnetic storms to score space weather threats to Earth on a 0–10 scale.

A detailed explanation is coming soon.

<TopicChart kind="solar" days={30} />

<CrossLinks current="solar" lang="en" />
```

- [ ] **Step 10: en/methodology.mdx**

```mdx
---
title: "Earth Doom Index Methodology"
description: "How the four threat indices of Earth Doom Index combine into a 0–100 daily doom score."
keywords: ["doom index methodology", "threat index calculation"]
publishedAt: "2026-04-26"
---

import CrossLinks from '../../components/CrossLinks.jsx'

# Methodology

This page is under construction.

Earth Doom Index combines four domain scores — society (0–30), climate (0–30), economy (0–30), and solar (0–10) — into a 0–100 daily doom score. Per-domain calculation details are on each topic page.

A full algorithmic breakdown is coming soon.

<CrossLinks current="methodology" lang="en" />
```

- [ ] **Step 11: 동작 확인**

```bash
npm run dev
```

브라우저에서 다음을 모두 확인:
- `/ko/about/society`, `/ko/about/climate`, `/ko/about/economy`, `/ko/about/solar`, `/ko/about/methodology`
- `/en/about/society`, `/en/about/climate`, `/en/about/economy`, `/en/about/solar`, `/en/about/methodology`

각 페이지에 제목·안내문·TopicChart placeholder·CrossLinks가 보이는지 확인.

- [ ] **Step 12: Commit**

```bash
git add src/content/
git commit -m "feat(frontend): add 10 placeholder MDX files (ko/en × 5 topics)"
```

---

## Task 16: AboutTopic에 PageHead + frontmatter 적용

**Files:**
- Modify: `edi-frontend/src/routes/AboutTopic.jsx`

MDX 파일의 frontmatter는 `@mdx-js/rollup`이 별도 export로 노출하지 않는다. 따라서 frontmatter를 React 컴포넌트가 export하는 별도 객체로 처리해야 한다. 가장 단순한 접근: `remark-frontmatter` + `remark-mdx-frontmatter`를 추가하거나, 각 MDX 파일 상단에 `export const meta = {...}` 를 직접 작성.

후자가 의존성을 줄이므로 그쪽으로 간다.

- [ ] **Step 1: 모든 MDX 파일에 export 메타 추가**

각 MDX 파일의 frontmatter `---` 블록 **바로 아래** (import 전)에 다음 추가:

`ko/society.mdx`:
```mdx
export const meta = {
  title: "사회 위협 지수란? — GDELT 기반 글로벌 갈등 측정 | Earth Doom Index",
  description: "Earth Doom Index의 사회 위협 지수가 무엇이고, GDELT와 CAMEO 코드로 어떻게 0~30점으로 환산되는지 설명합니다.",
  publishedAt: "2026-04-26",
}
```

같은 패턴으로 나머지 9개 파일에도 추가:
- `ko/climate.mdx`: title="기후 위협 지수란? — OpenWeather 기반 극단 기상 측정 | Earth Doom Index", description="Earth Doom Index의 기후 위협 지수가 어떤 데이터와 방식으로 0~30점으로 환산되는지 설명합니다."
- `ko/economy.mdx`: title="경제 위협 지수란? — 글로벌 금융 시장 위험 측정 | Earth Doom Index", description="Earth Doom Index의 경제 위협 지수가 어떤 시장 지표로 0~30점으로 환산되는지 설명합니다."
- `ko/solar.mdx`: title="태양 위협 지수란? — 우주 기상 위협 측정 | Earth Doom Index", description="Earth Doom Index의 태양 위협 지수가 NOAA SWPC 데이터로 0~10점으로 어떻게 환산되는지 설명합니다."
- `ko/methodology.mdx`: title="Earth Doom Index 종합 산정 방법론", description="4개 영역의 위협 지수가 어떻게 종합되어 0~100점의 멸망 지수가 되는지 설명합니다."
- `en/society.mdx`: title="Society Threat Index — How GDELT Measures Global Conflict | Earth Doom Index", description="How the Society Threat Index of Earth Doom Index converts GDELT and CAMEO event data into a 0–30 score."
- `en/climate.mdx`: title="Climate Threat Index — Measuring Extreme Weather | Earth Doom Index", description="How the Climate Threat Index of Earth Doom Index uses OpenWeather data to score extreme weather events on a 0–30 scale."
- `en/economy.mdx`: title="Economy Threat Index — Tracking Market Risk | Earth Doom Index", description="How the Economy Threat Index of Earth Doom Index uses global market data to score recession and instability risks on a 0–30 scale."
- `en/solar.mdx`: title="Solar Threat Index — Space Weather and Earth | Earth Doom Index", description="How the Solar Threat Index of Earth Doom Index uses NOAA SWPC data to score space weather threats on a 0–10 scale."
- `en/methodology.mdx`: title="Earth Doom Index Methodology", description="How the four threat indices of Earth Doom Index combine into a 0–100 daily doom score."

전부 `publishedAt: "2026-04-26"` 동일.

- [ ] **Step 2: AboutTopic.jsx 수정 — meta 추출 및 PageHead 적용**

`edi-frontend/src/routes/AboutTopic.jsx` 전체 교체:

```jsx
import { useOutletContext, useParams, Navigate } from 'react-router-dom'
import { lazy, Suspense, useMemo, useState, useEffect } from 'react'
import PageHead from '../seo/PageHead.jsx'
import { articleJsonLd, breadcrumbJsonLd, organizationJsonLd } from '../seo/jsonLd.js'

const VALID_TOPICS = ['society', 'climate', 'economy', 'solar', 'methodology']
const mdxModules = import.meta.glob('../content/*/*.mdx')

function loadMdx(lang, topic) {
  const path = `../content/${lang}/${topic}.mdx`
  const loader = mdxModules[path]
  if (!loader) return null
  return {
    Component: lazy(() => loader().then(m => ({ default: m.default }))),
    metaPromise: loader().then(m => m.meta ?? {}),
  }
}

export default function AboutTopic() {
  const { lang, t } = useOutletContext()
  const { topic } = useParams()
  const [meta, setMeta] = useState(null)

  const a = t.about
  const valid = VALID_TOPICS.includes(topic)
  const loaded = useMemo(() => (valid ? loadMdx(lang, topic) : null), [valid, lang, topic])

  useEffect(() => {
    if (loaded) loaded.metaPromise.then(setMeta)
  }, [loaded])

  if (!valid || !loaded) {
    return <Navigate to={`/${lang}/about`} replace />
  }

  const path = `/${lang}/about/${topic}`
  const koPath = `/ko/about/${topic}`
  const enPath = `/en/about/${topic}`

  const breadcrumb = breadcrumbJsonLd([
    { name: a.breadcrumbHome, path: `/${lang}` },
    { name: a.breadcrumbAbout, path: `/${lang}/about` },
    { name: a.topicLabels[topic], path },
  ])
  const article = meta ? articleJsonLd({
    title: meta.title,
    description: meta.description,
    path,
    datePublished: meta.publishedAt,
    lang,
  }) : null

  return (
    <>
      <PageHead
        title={meta?.title}
        description={meta?.description}
        path={path}
        koPath={koPath}
        enPath={enPath}
        jsonLd={article ? [organizationJsonLd(), breadcrumb, article] : [organizationJsonLd(), breadcrumb]}
      />
      <main className="about-topic">
        <nav className="breadcrumb">
          <a href={`/${lang}`}>{a.breadcrumbHome}</a>
          {' > '}
          <a href={`/${lang}/about`}>{a.breadcrumbAbout}</a>
          {' > '}
          <span>{a.topicLabels[topic]}</span>
        </nav>
        <Suspense fallback={<p>Loading...</p>}>
          <loaded.Component />
        </Suspense>
      </main>
    </>
  )
}
```

- [ ] **Step 3: 동작 확인**

```bash
npm run dev
```

`/ko/about/society` 접속 → 브라우저 개발자도구 → `<head>`에서:
- `<title>`이 MDX의 `meta.title`로 설정됨
- `<meta name="description">`도 설정됨
- `<link rel="canonical" href=".../ko/about/society">`
- `<link rel="alternate" hreflang="en" href=".../en/about/society">`
- `<script type="application/ld+json">` 3개 (Organization, Breadcrumb, Article)

다른 토픽도 마찬가지로 확인.

- [ ] **Step 4: Commit**

```bash
git add src/routes/AboutTopic.jsx src/content/
git commit -m "feat(frontend): apply PageHead and JSON-LD to about topic pages"
```

---

## Task 17: TopNav에 about 메뉴 추가 + react-router 호환

**Files:**
- Modify: `edi-frontend/src/components/TopNav.jsx`

기존 TopNav는 정적 anchor 네비. 라우팅 도입 후엔 `<Link>` 사용해야 SPA 전환이 자연스럽고, about 드롭다운도 추가해야 한다.

- [ ] **Step 1: TopNav.jsx 전체 교체**

`edi-frontend/src/components/TopNav.jsx`:

```jsx
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { translations } from '../i18n.js'

const TOPICS = ['society', 'climate', 'economy', 'solar']

export default function TopNav({ lang, onToggle }) {
  const [open, setOpen] = useState(false)
  const t = translations[lang]
  const a = t.about

  return (
    <nav className="top-nav">
      <Link to={`/${lang}`} className="nav-brand">
        EARTH DOOM INDEX
      </Link>

      <div className="nav-menu">
        <div
          className="nav-dropdown-wrap"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <button
            className="nav-link"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
          >
            {a.navLabel} ▾
          </button>
          {open && (
            <ul className="nav-dropdown">
              <li>
                <Link to={`/${lang}/about`} onClick={() => setOpen(false)}>
                  {a.indexTitle}
                </Link>
              </li>
              {TOPICS.map(topic => (
                <li key={topic}>
                  <Link to={`/${lang}/about/${topic}`} onClick={() => setOpen(false)}>
                    {a.topicLabels[topic]}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link to={`/${lang}/about/methodology`} className="nav-link">
          {a.navMethodology}
        </Link>
      </div>

      <button className="lang-toggle" onClick={onToggle}>
        <span className={lang === 'ko' ? 'nes-text is-primary' : ''}>KO</span>
        {' / '}
        <span className={lang === 'en' ? 'nes-text is-primary' : ''}>EN</span>
      </button>
    </nav>
  )
}
```

- [ ] **Step 2: App.css에 nav-menu/nav-dropdown 스타일 추가**

`edi-frontend/src/App.css` 끝에 추가:

```css
.nav-menu {
  display: flex;
  gap: 16px;
  align-items: center;
}

.nav-link {
  background: none;
  border: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  padding: 4px 8px;
  text-decoration: none;
}

.nav-link:hover {
  text-decoration: underline;
}

.nav-dropdown-wrap {
  position: relative;
}

.nav-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: #212529;
  border: 4px solid #fff;
  list-style: none;
  margin: 0;
  padding: 8px 0;
  min-width: 220px;
  z-index: 100;
}

.nav-dropdown li {
  padding: 0;
}

.nav-dropdown a {
  display: block;
  padding: 8px 16px;
  color: #fff;
  text-decoration: none;
  font-size: 0.85em;
}

.nav-dropdown a:hover {
  background: #5a5a5a;
}

@media (max-width: 600px) {
  .nav-menu {
    display: none; /* 모바일은 Phase 1에선 메뉴 숨김. 카드 모달과 푸터로 진입 */
  }
}
```

- [ ] **Step 3: 동작 확인**

```bash
npm run dev
```

`/ko`에서:
- 상단 네비 "지표 설명" 호버 시 드롭다운 5개 항목 (인덱스 + 4개 토픽)
- 각 클릭 시 정상 이동
- "방법론" 클릭 시 `/ko/about/methodology`로 이동
- 데스크톱·모바일 모두 깨지지 않음

- [ ] **Step 4: Commit**

```bash
git add src/components/TopNav.jsx src/App.css
git commit -m "feat(frontend): add about dropdown and methodology link to TopNav"
```

---

## Task 18: Footer에 about 링크 추가

**Files:**
- Modify: `edi-frontend/src/components/Footer.jsx`

- [ ] **Step 1: Footer.jsx 전체 교체**

`edi-frontend/src/components/Footer.jsx`:

```jsx
import { Link } from 'react-router-dom'

const TOPICS = ['society', 'climate', 'economy', 'solar', 'methodology']

export default function Footer({ lang, t, onShowTerms }) {
  const a = t.about

  return (
    <footer className="site-footer">
      <div className="footer-row footer-about">
        {TOPICS.map(topic => (
          <span key={topic}>
            <Link to={`/${lang}/about/${topic}`} className="footer-link">
              {a.topicLabels[topic].replace(/^\S+\s/, '')}
            </Link>
            <span className="footer-sep">|</span>
          </span>
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

이모지 prefix(`🏙 사회 위협 지수`)를 footer에선 빼기 위해 `.replace(/^\S+\s/, '')` — 첫 토큰 제거. footer는 좁아서.

- [ ] **Step 2: App.jsx에서 Footer 호출에 lang prop 전달**

`edi-frontend/src/App.jsx`:

```jsx
<Footer lang={lang} t={t} onShowTerms={() => setShowTerms(true)} />
```

- [ ] **Step 3: AboutLayout.jsx에서 Footer 호출에 lang prop 전달**

`edi-frontend/src/routes/AboutLayout.jsx`의 Footer 사용처를:

```jsx
<Footer lang={lang} t={t} onShowTerms={() => setShowTerms(true)} />
```

- [ ] **Step 4: App.css에 footer-about 스타일 추가**

`edi-frontend/src/App.css` 끝에 추가:

```css
.footer-about {
  flex-wrap: wrap;
  justify-content: center;
  font-size: 0.75em;
  margin-bottom: 8px;
  opacity: 0.85;
}
```

- [ ] **Step 5: 동작 확인**

```bash
npm run dev
```

`/ko`, `/en`, `/ko/about/society` 등 모든 페이지의 푸터에 about 링크들이 잘 보이고 클릭 시 이동하는지 확인.

- [ ] **Step 6: Commit**

```bash
git add src/components/Footer.jsx src/App.jsx src/routes/AboutLayout.jsx src/App.css
git commit -m "feat(frontend): add about links row to Footer"
```

---

## Task 19: 점수 카드 모달에 "더 알아보기" 버튼 추가

**Files:**
- Modify: `edi-frontend/src/App.jsx`
- Modify: `edi-frontend/src/i18n.js`

- [ ] **Step 1: App.jsx의 카드 모달에 버튼 추가**

`App.jsx`의 카드 모달 JSX(`{selectedCard && ( ... )}` 블록):

기존:
```jsx
<div className="modal-content">
  <p>{t.cards[selectedCard].desc}</p>
  <p className="card-info-source">
    {t.cardInfoSource(t.cards[selectedCard].source, CARD_INFO[selectedCard].max)}
  </p>
</div>
<button
  className="nes-btn is-error modal-close"
  onClick={() => setSelectedCard(null)}
>
  {t.termsClose}
</button>
```

변경 후:
```jsx
<div className="modal-content">
  <p>{t.cards[selectedCard].desc}</p>
  <p className="card-info-source">
    {t.cardInfoSource(t.cards[selectedCard].source, CARD_INFO[selectedCard].max)}
  </p>
</div>
<div className="modal-actions">
  <a
    href={`/${lang}/about/${selectedCard}`}
    className="nes-btn is-primary"
  >
    {t.about.learnMore}
  </a>
  <button
    className="nes-btn is-error modal-close"
    onClick={() => setSelectedCard(null)}
  >
    {t.termsClose}
  </button>
</div>
```

- [ ] **Step 2: App.css에 modal-actions 스타일 추가**

`edi-frontend/src/App.css` 끝에 추가:

```css
.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}
```

- [ ] **Step 3: 동작 확인**

```bash
npm run dev
```

`/ko`에서 사회 카드 클릭 → 모달의 "자세히 알아보기 →" 버튼 → `/ko/about/society`로 이동되는지 확인. 4개 카드 전부.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/App.css
git commit -m "feat(frontend): add learn more link in score card modal"
```

---

## Task 20: 메인 페이지 explainer 섹션 추가

**Files:**
- Modify: `edi-frontend/src/App.jsx`
- Modify: `edi-frontend/src/App.css`

- [ ] **Step 1: App.jsx에 explainer 섹션 JSX 추가**

`App.jsx`에서 `<DoomChart historyData={...} />` 직후, `<Footer ... />` 직전에 추가:

```jsx
{/* Explainer 섹션 */}
<section className="nes-container is-dark with-title explainer-section">
  <p className="title">📐 {t.about.mainExplainerTitle}</p>
  <div className="explainer-body">
    <p>{t.about.mainExplainerLead}</p>
    <div className="explainer-cards">
      <a href={`/${lang}/about/society`} className="nes-btn">{t.about.topicLabels.society} →</a>
      <a href={`/${lang}/about/climate`} className="nes-btn">{t.about.topicLabels.climate} →</a>
      <a href={`/${lang}/about/economy`} className="nes-btn">{t.about.topicLabels.economy} →</a>
      <a href={`/${lang}/about/solar`} className="nes-btn">{t.about.topicLabels.solar} →</a>
    </div>
    <a href={`/${lang}/about/methodology`} className="nes-btn is-primary explainer-cta">
      {t.about.mainExplainerCta}
    </a>
  </div>
</section>
```

- [ ] **Step 2: App.css에 스타일 추가**

`edi-frontend/src/App.css` 끝에 추가:

```css
.explainer-section {
  margin: 24px 0;
}

.explainer-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px;
}

.explainer-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 8px 0;
}

.explainer-cta {
  margin-top: 8px;
  text-align: center;
}

@media (max-width: 480px) {
  .explainer-cards {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: 동작 확인**

```bash
npm run dev
```

`/ko`, `/en`에서 차트 아래·푸터 위에 explainer 섹션이 보이고, 5개 링크 전부 정상 이동하는지 확인.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/App.css
git commit -m "feat(frontend): add explainer section to main page"
```

---

## Task 21: PageHead를 메인 페이지에도 적용

**Files:**
- Modify: `edi-frontend/src/App.jsx`

기존 `index.html`이 정적 메타를 가지고 있어 `/ko`, `/en`도 같은 메타를 갖는다. PageHead로 페이지별 메타 + hreflang 정상화.

- [ ] **Step 1: App.jsx에 PageHead import + 사용 추가**

`App.jsx` 상단 import:

```jsx
import PageHead from './seo/PageHead.jsx'
import { organizationJsonLd } from './seo/jsonLd.js'
```

`App` 컴포넌트의 정상 렌더 분기(`return ( <> <TopNav .../> <div className="game-screen"> ...`) 바로 위에 PageHead 추가. `<>` fragment 안에 다음을 가장 먼저 두기:

```jsx
return (
  <>
    <PageHead
      title={lang === 'ko'
        ? 'Earth Doom Index — 오늘 지구는 얼마나 망했나?'
        : 'Earth Doom Index — How Close Is Earth to Doom Today?'}
      description={lang === 'ko'
        ? 'DOOM-9000이 매일 계산하는 지구 멸망 지수. 사회·기후·경제·태양 4개 영역 위협을 종합한 0~100점.'
        : 'Daily Earth Doom Index calculated by DOOM-9000. A 0–100 score combining society, climate, economy, and solar threat signals.'}
      path={`/${lang}`}
      koPath="/ko"
      enPath="/en"
      jsonLd={organizationJsonLd()}
    />
    <TopNav lang={lang} onToggle={onToggleLang} />
    {/* ... 기존 본문 ... */}
  </>
)
```

loading/error/noData 분기에도 동일하게 PageHead를 최상단에 둘지는 우선순위 낮음 — Phase 1에선 정상 분기에만 적용.

- [ ] **Step 2: index.html의 메타 단순화**

`edi-frontend/index.html`을 다음으로 정리 (페이지별 메타는 PageHead가 처리하므로, `index.html`은 sane defaults만 둠):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Earth Doom Index</title>
    <meta name="description" content="Daily Earth Doom Index — a 0–100 score combining global threat signals." />
    <meta name="robots" content="index, follow" />

    <meta property="og:image" content="https://www.earthdoomindex.com/api/og" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:type" content="website" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="https://www.earthdoomindex.com/api/og" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/galmuri/dist/galmuri.css" rel="stylesheet" />

    <script async src="https://www.googletagmanager.com/gtag/js?id=G-JXBQ7GGV9B"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-JXBQ7GGV9B');
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

기존 `keywords`, `hreflang` (틀린 값들), 페이지별 `og:title`/`og:description`, `og:url`은 제거. PageHead가 모든 페이지에서 이를 동적으로 주입한다.

- [ ] **Step 3: 동작 확인**

```bash
npm run dev
```

`/ko`, `/en`에서 `<head>` 검사:
- `<title>`이 한국어/영어로 다르게 표시
- `<meta name="description">` 다름
- `<link rel="canonical">` 다름
- `<link rel="alternate" hreflang="ko">`, `<link rel="alternate" hreflang="en">` 모두 자기 짝 URL 가리킴

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx index.html
git commit -m "feat(frontend): apply PageHead to main page, simplify index.html defaults"
```

---

## Task 22: sitemap.xml 갱신

**Files:**
- Modify: `edi-frontend/public/sitemap.xml`

- [ ] **Step 1: sitemap.xml 전체 교체**

`edi-frontend/public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://www.earthdoomindex.com/ko</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="https://www.earthdoomindex.com/ko"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://www.earthdoomindex.com/en"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.earthdoomindex.com/en"/>
  </url>
  <url>
    <loc>https://www.earthdoomindex.com/en</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="https://www.earthdoomindex.com/ko"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://www.earthdoomindex.com/en"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.earthdoomindex.com/en"/>
  </url>
  <url>
    <loc>https://www.earthdoomindex.com/ko/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="https://www.earthdoomindex.com/ko/about"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://www.earthdoomindex.com/en/about"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.earthdoomindex.com/en/about"/>
  </url>
  <url>
    <loc>https://www.earthdoomindex.com/en/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="https://www.earthdoomindex.com/ko/about"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://www.earthdoomindex.com/en/about"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.earthdoomindex.com/en/about"/>
  </url>
  <url>
    <loc>https://www.earthdoomindex.com/ko/about/society</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="https://www.earthdoomindex.com/ko/about/society"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://www.earthdoomindex.com/en/about/society"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.earthdoomindex.com/en/about/society"/>
  </url>
  <url>
    <loc>https://www.earthdoomindex.com/en/about/society</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="https://www.earthdoomindex.com/ko/about/society"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://www.earthdoomindex.com/en/about/society"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.earthdoomindex.com/en/about/society"/>
  </url>
  <url>
    <loc>https://www.earthdoomindex.com/ko/about/climate</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="https://www.earthdoomindex.com/ko/about/climate"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://www.earthdoomindex.com/en/about/climate"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.earthdoomindex.com/en/about/climate"/>
  </url>
  <url>
    <loc>https://www.earthdoomindex.com/en/about/climate</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="https://www.earthdoomindex.com/ko/about/climate"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://www.earthdoomindex.com/en/about/climate"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.earthdoomindex.com/en/about/climate"/>
  </url>
  <url>
    <loc>https://www.earthdoomindex.com/ko/about/economy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="https://www.earthdoomindex.com/ko/about/economy"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://www.earthdoomindex.com/en/about/economy"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.earthdoomindex.com/en/about/economy"/>
  </url>
  <url>
    <loc>https://www.earthdoomindex.com/en/about/economy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="https://www.earthdoomindex.com/ko/about/economy"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://www.earthdoomindex.com/en/about/economy"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.earthdoomindex.com/en/about/economy"/>
  </url>
  <url>
    <loc>https://www.earthdoomindex.com/ko/about/solar</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="https://www.earthdoomindex.com/ko/about/solar"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://www.earthdoomindex.com/en/about/solar"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.earthdoomindex.com/en/about/solar"/>
  </url>
  <url>
    <loc>https://www.earthdoomindex.com/en/about/solar</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="https://www.earthdoomindex.com/ko/about/solar"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://www.earthdoomindex.com/en/about/solar"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.earthdoomindex.com/en/about/solar"/>
  </url>
  <url>
    <loc>https://www.earthdoomindex.com/ko/about/methodology</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="https://www.earthdoomindex.com/ko/about/methodology"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://www.earthdoomindex.com/en/about/methodology"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.earthdoomindex.com/en/about/methodology"/>
  </url>
  <url>
    <loc>https://www.earthdoomindex.com/en/about/methodology</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="https://www.earthdoomindex.com/ko/about/methodology"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://www.earthdoomindex.com/en/about/methodology"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.earthdoomindex.com/en/about/methodology"/>
  </url>
</urlset>
```

총 14개 URL (메인 2 + about 12). 기존 `/` 항목은 제거됐다 (`/`는 리다이렉트라 sitemap 미포함).

- [ ] **Step 2: 동작 확인**

```bash
npm run dev
```

`http://localhost:5173/sitemap.xml`로 접속해 14개 URL이 모두 보이는지 확인.

- [ ] **Step 3: Commit**

```bash
git add public/sitemap.xml
git commit -m "feat(frontend): update sitemap.xml with 14 new URLs"
```

---

## Task 23: vercel.json 정정

**Files:**
- Modify: `edi-frontend/vercel.json`

기존 rewrite는 모든 비-API 경로를 `/index.html`로 보낸다. SSG 도입 후엔 정적 HTML 파일들이 직접 서빙되어야 하고, fallback만 SPA index로 가야 한다.

- [ ] **Step 1: vercel.json 교체**

`edi-frontend/vercel.json`:

```json
{
  "cleanUrls": true,
  "trailingSlash": false
}
```

`cleanUrls: true`로 설정하면 Vercel이 `/ko/about/society.html` 정적 파일을 `/ko/about/society` URL로 자동 매핑한다. SSG 빌드 결과가 path 기반 디렉터리 구조면 `cleanUrls`만으로 충분.

기존 `rewrites`는 제거 — 정적 파일 우선 서빙되고, 없는 경로는 자연스럽게 404 처리. SPA fallback이 필요한 경우(클라이언트 라우팅 후 새로고침 등)는 SSG가 모든 라우트를 정적으로 빌드하므로 fallback이 필요하지 않다.

- [ ] **Step 2: API 라우트 동작 확인 (코드 수준)**

`edi-frontend/api/og.js`가 그대로 있는지 확인. Vercel의 기본 `/api/*` 라우팅으로 자동 처리되므로 별도 설정 불필요.

```bash
ls api/
```

`og.js` 파일 존재 확인.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat(frontend): switch vercel.json to cleanUrls for SSG output"
```

---

## Task 24: 전체 빌드 검증 + 수동 시나리오

**Files:** 없음 (검증 단계)

- [ ] **Step 1: 풀 빌드 실행**

```bash
cd edi-frontend
npm run build
```

빌드가 성공하고 다음 메시지가 나오는지 확인:
- `vite v8.x building for production...`
- `vite-react-ssg`가 SSR을 시작하고 라우트를 렌더링한다는 로그
- 최종적으로 `dist/` 디렉터리에 빌드 결과 출력

빌드 실패 시 에러 메시지 분석. `vite-react-ssg`가 React Router 설정을 인식하지 못하면 `routes.jsx`의 export 형식이나 `main.jsx`의 ViteReactSSG 호출 형식을 라이브러리 docs에 맞게 조정 필요.

- [ ] **Step 2: dist 디렉터리 구조 확인**

```bash
find dist -name "*.html" | sort
```

다음 15개 HTML 파일이 있어야 한다:
- `dist/index.html` (`/`)
- `dist/ko/index.html`
- `dist/en/index.html`
- `dist/ko/about/index.html`
- `dist/en/about/index.html`
- `dist/ko/about/society/index.html`
- `dist/ko/about/climate/index.html`
- `dist/ko/about/economy/index.html`
- `dist/ko/about/solar/index.html`
- `dist/ko/about/methodology/index.html`
- `dist/en/about/society/index.html`
- `dist/en/about/climate/index.html`
- `dist/en/about/economy/index.html`
- `dist/en/about/solar/index.html`
- `dist/en/about/methodology/index.html`

(파일 위치는 SSG 도구에 따라 살짝 다를 수 있다. 위 패턴이거나 `dist/ko/about/society.html` 형태도 가능. 핵심은 15개 정적 HTML이 생성되는 것.)

- [ ] **Step 3: prerender 본문 검증**

각 토픽 페이지 HTML에 본문 텍스트가 박혀 있는지 확인:

```bash
grep -l "사회 위협 지수" dist/ko/about/society/index.html
grep -l "Society Threat Index" dist/en/about/society/index.html
grep -l "기후 위협 지수" dist/ko/about/climate/index.html
grep -l "Climate Threat Index" dist/en/about/climate/index.html
grep -l "경제 위협 지수" dist/ko/about/economy/index.html
grep -l "태양 위협 지수" dist/ko/about/solar/index.html
grep -l "종합 산정 방법론" dist/ko/about/methodology/index.html
```

각 명령이 매칭 파일을 출력해야 한다 (출력이 없으면 prerender 실패).

- [ ] **Step 4: 메타 태그 검증**

```bash
grep "rel=\"canonical\"" dist/ko/about/society/index.html
grep "hreflang=\"ko\"" dist/ko/about/society/index.html
grep "hreflang=\"en\"" dist/ko/about/society/index.html
grep "application/ld+json" dist/ko/about/society/index.html
```

각 명령이 매칭을 출력해야 한다.

- [ ] **Step 5: 로컬 preview 서버에서 수동 시나리오**

```bash
npm run preview
```

기본 포트(보통 4173 또는 5173)에서 다음 시나리오 모두 통과 확인:

1. **`/` 자동 리다이렉트**: `http://localhost:4173/`로 진입 → 즉시 `/ko` 또는 `/en`로 이동.
2. **메인 → 토픽 (모달 경로)**: `/ko`에서 사회 카드 클릭 → 모달 → "자세히 알아보기 →" → `/ko/about/society` 도착.
3. **메인 → 토픽 (네비 드롭다운)**: `/ko` 상단 네비 "지표 설명" 호버 → 사회 클릭 → `/ko/about/society` 도착.
4. **메인 → 토픽 (explainer 섹션)**: `/ko` 차트 아래 explainer 섹션의 사회 버튼 → `/ko/about/society` 도착.
5. **메인 → 토픽 (푸터)**: 어떤 페이지든 푸터의 "사회" → `/ko/about/society` 도착.
6. **언어 토글 (메인)**: `/ko` → KO/EN 토글 → `/en` 도착, 텍스트 영어로.
7. **언어 토글 (토픽)**: `/ko/about/society` → KO/EN 토글 → `/en/about/society` 도착, 텍스트 영어로.
8. **CrossLinks**: `/ko/about/society` 하단 "관련 토픽"에서 기후 클릭 → `/ko/about/climate` 도착.
9. **methodology 진입**: `/ko/about` 또는 `/ko/about/society`에서 methodology 카드/링크 → `/ko/about/methodology` 도착.
10. **breadcrumb**: `/ko/about/society`의 breadcrumb "지표 설명" 클릭 → `/ko/about` 도착.
11. **JS 비활성화 시 본문 노출**: 브라우저 JS 비활성화 후 `http://localhost:4173/ko/about/society` 접속 → "사회 위협 지수란?" 텍스트가 보임 (prerender 검증).
12. **존재하지 않는 토픽**: `/ko/about/invalid` → `/ko/about` 으로 리다이렉트.
13. **점수 카드 모달 4개 전부**: 4개 카드 각각 "자세히 알아보기 →" 동작.
14. **약관 모달**: 푸터의 "이용약관" 클릭 → 모달 정상 동작.
15. **투표 섹션**: 메인 페이지 투표 섹션이 기존대로 동작.

- [ ] **Step 6: ESLint 검증**

```bash
npm run lint
```

기존 ESLint 규칙 통과 확인. 새로 도입된 `react-router-dom`, MDX 관련 import 모두 깨끗해야 한다.

- [ ] **Step 7: 최종 커밋 (검증 결과 메모만)**

이번 단계는 새 파일이 없을 가능성 큼. 만약 검증 중 사소한 수정이 발생했다면:

```bash
git add <changed_files>
git commit -m "fix(frontend): adjustments from full build verification"
```

수정 없으면 커밋 없이 task 종료.

- [ ] **Step 8: PR 생성 또는 main 머지**

작업이 완료되면 사용자에게 PR 생성 여부를 묻는다. 사용자가 PR을 원하면:

```bash
git push -u origin <branch-name>
gh pr create --title "feat(frontend): explainer pages Phase 1 — infrastructure & skeleton" --body "$(cat <<'EOF'
## Summary
- React Router + vite-react-ssg + MDX 인프라 도입으로 15개 정적 HTML 빌드
- `/`, `/ko`, `/en`, `/{lang}/about`, `/{lang}/about/{topic}` 라우트 구성
- TopNav, Footer, 카드 모달, 푸터, 메인 explainer 섹션에 about 진입점 연결
- PageHead + JSON-LD(Article, Breadcrumb, Organization) + sitemap.xml 14개 URL 갱신

## Spec
docs/superpowers/specs/2026-04-26-explainer-pages-design.md

## Test plan
- [x] `npm run build` 성공, dist/에 15개 HTML 생성
- [x] 각 HTML에 prerendered 본문·메타·canonical·hreflang·JSON-LD 박힘
- [x] 메인 → about 진입 경로 5개 (모달, 네비, explainer, 푸터, breadcrumb) 정상
- [x] 언어 토글 시 URL 전환 정상
- [x] JS 비활성화 시 본문 노출 (prerender 검증)
- [ ] 배포 후 실 도메인에서 sitemap.xml 접근 확인
- [ ] Search Console에 sitemap 재제출

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Notes

이 plan은 spec(`docs/superpowers/specs/2026-04-26-explainer-pages-design.md`)을 다음과 같이 커버한다:

| Spec 섹션 | 커버 task |
|---|---|
| 의존성 변경 | Task 1 |
| 라우트 구조 (15 HTML) | Task 6, 7, 8, 9, 24(검증) |
| 언어 감지 & 리다이렉트 | Task 7 |
| 언어 토글 동작 변경 | Task 6, 8 |
| Vercel 설정 변경 | Task 23 |
| 파일 구조 | Task 1~24 전반 |
| MDX 파일 구조 (placeholder) | Task 15, 16 |
| MDX 렌더링 흐름 | Task 9, 16 |
| 빌드 흐름 | Task 1(scripts), 24 |
| TopNav 확장 | Task 17 |
| 점수 카드 모달 "더 알아보기" | Task 19 |
| Explainer 섹션 신규 | Task 20 |
| Footer 확장 | Task 18 |
| /{lang}/about 허브 | Task 8, 14 |
| /{lang}/about/{topic} 페이지 | Task 9, 16 |
| App.jsx 리팩터링 (TopNav/Footer 분리) | Task 3, 4, 5 |
| PageHead.jsx | Task 10, 21 |
| JSON-LD | Task 11 |
| sitemap.xml 갱신 | Task 22 |
| robots.txt | 변경 없음 (spec 명시) |
| 콘텐츠 분량 (Phase 1 placeholder) | Task 15 |
| 테스트 & 검증 | Task 24 |

비목표(spec 명시)는 plan에 포함되지 않았다 — 정상.
