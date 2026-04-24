# OG 이미지 동적 생성 + 링크 공유 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SNS 링크 공유 시 오늘의 지구 멸망 점수가 반영된 OG 이미지가 자동 표시되고, 메인 카드 하단에 트위터 공유 + 링크 복사 버튼을 제공한다.

**Architecture:** Vercel Edge Function(`api/og.jsx`)이 백엔드 API에서 오늘 점수를 가져와 `@vercel/og`로 1200×630 PNG를 생성한다. `index.html`의 `og:image`가 이 엔드포인트를 가리키며, 프론트엔드에는 `ShareButtons` 컴포넌트를 추가한다.

**Tech Stack:** `@vercel/og`, React (기존), Vercel Edge Functions

**Spec:** `docs/superpowers/specs/2026-04-24-og-image-share-design.md`

---

## File Map

| 파일 | 변경 |
|------|------|
| `edi-frontend/package.json` | `@vercel/og` 추가 |
| `edi-frontend/api/og.jsx` | **신규** — Edge Function |
| `edi-frontend/index.html` | `og:image`, `twitter:card` 수정 |
| `edi-frontend/src/i18n.js` | `share` 번역 키 추가 |
| `edi-frontend/src/App.jsx` | `ShareButtons` 컴포넌트 추가 |
| `edi-frontend/src/App.css` | 공유 버튼 + 토스트 스타일 추가 |

---

## Task 1: `@vercel/og` 패키지 설치

**Files:**
- Modify: `edi-frontend/package.json`

- [ ] **Step 1: 패키지 설치**

```bash
cd edi-frontend
npm install @vercel/og
```

Expected output: `added N packages` — `@vercel/og` 항목이 `dependencies`에 추가됨

- [ ] **Step 2: 설치 확인**

```bash
cat package.json | grep vercel
```

Expected: `"@vercel/og": "^X.X.X"` 라인 출력

- [ ] **Step 3: 커밋**

```bash
git add edi-frontend/package.json edi-frontend/package-lock.json
git commit -m "feat: add @vercel/og dependency"
```

---

## Task 2: `i18n.js`에 공유 번역 추가

**Files:**
- Modify: `edi-frontend/src/i18n.js`

- [ ] **Step 1: ko 객체에 `share` 키 추가**

`edi-frontend/src/i18n.js`의 `ko` 객체 맨 마지막 `vote: { ... }` 블록 바로 뒤에 추가한다.

```js
// vote: { ... }, 다음 줄
share: {
  twitter: '트위터 공유',
  copy: '링크 복사',
  copied: '복사됨!',
},
```

- [ ] **Step 2: en 객체에 `share` 키 추가**

`en` 객체의 `vote: { ... }` 블록 바로 뒤에 동일하게 추가한다.

```js
share: {
  twitter: 'SHARE',
  copy: 'COPY LINK',
  copied: 'COPIED!',
},
```

- [ ] **Step 3: 커밋**

```bash
git add edi-frontend/src/i18n.js
git commit -m "feat: add share button translations to i18n"
```

---

## Task 3: Edge Function `api/og.jsx` 생성

**Files:**
- Create: `edi-frontend/api/og.jsx`

- [ ] **Step 1: `api/` 디렉토리 생성 확인**

```bash
ls edi-frontend/
```

`api/` 폴더가 없으면:
```bash
mkdir edi-frontend/api
```

- [ ] **Step 2: `og.jsx` 파일 생성**

`edi-frontend/api/og.jsx`를 아래 내용으로 작성한다:

```jsx
import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

const SCORE_COLORS = {
  doom:     '#e63946',
  critical: '#e63946',
  danger:   '#f0a844',
  caution:  '#e9c46a',
  notice:   '#b8d941',
  safe:     '#57cc99',
}

function getDangerInfo(score) {
  if (score >= 86) return { label: 'DOOM',             color: SCORE_COLORS.doom }
  if (score >= 71) return { label: 'BEYOND RECOVERY',  color: SCORE_COLORS.critical }
  if (score >= 51) return { label: 'NEAR CRITICAL',    color: SCORE_COLORS.danger }
  if (score >= 31) return { label: 'ACCELERATING',     color: SCORE_COLORS.caution }
  if (score >= 16) return { label: 'ANOMALY DETECTED', color: SCORE_COLORS.notice }
  return               { label: 'PEACEFUL ILLUSION', color: SCORE_COLORS.safe }
}

async function loadPressStart2PFont() {
  const css = await fetch(
    'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
    { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' } }
  ).then(r => r.text())

  const fontUrl = css.match(/url\((.+?\.woff2)\)/)?.[1]
  if (!fontUrl) return null
  return fetch(fontUrl).then(r => r.arrayBuffer())
}

export default async function handler() {
  const API_BASE = process.env.VITE_API_URL ?? ''

  let score = null
  let dangerInfo = { label: 'EARTH DOOM INDEX', color: '#aaaaaa' }
  let commentary = ''
  let dateStr = ''

  try {
    const res = await fetch(`${API_BASE}/api/today-doom`)
    if (res.ok) {
      const data = await res.json()
      score = data.total_score
      dangerInfo = getDangerInfo(score)
      const raw = data.ai_commentary_en ?? ''
      commentary = raw.length > 80 ? raw.slice(0, 80) + '...' : raw
      const d = new Date(data.target_date)
      dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    }
  } catch (_) {
    // 폴백: 점수 없이 타이틀만 표시
  }

  const fontData = await loadPressStart2PFont().catch(() => null)
  const fonts = fontData
    ? [{ name: 'Press Start 2P', data: fontData, style: 'normal', weight: 400 }]
    : []

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#212529',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: fonts.length ? '"Press Start 2P"' : 'monospace',
          color: '#ffffff',
          padding: '60px',
          position: 'relative',
        }}
      >
        {/* 상단 타이틀 */}
        <div style={{ fontSize: '18px', color: '#888888', marginBottom: '12px', letterSpacing: '3px', display: 'flex' }}>
          EARTH DOOM INDEX
        </div>

        {/* 날짜 */}
        {dateStr ? (
          <div style={{ fontSize: '12px', color: '#555555', marginBottom: '36px', display: 'flex' }}>
            {dateStr}
          </div>
        ) : null}

        {/* 점수 */}
        {score !== null ? (
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '24px' }}>
            <span style={{ fontSize: '128px', color: dangerInfo.color, lineHeight: 1 }}>
              {score}
            </span>
            <span style={{ fontSize: '36px', color: '#555555', marginLeft: '12px' }}>
              / 100
            </span>
          </div>
        ) : (
          <div style={{ fontSize: '48px', color: '#555555', marginBottom: '24px', display: 'flex' }}>
            — / 100
          </div>
        )}

        {/* 위험 레벨 배지 */}
        <div
          style={{
            fontSize: '22px',
            color: dangerInfo.color,
            border: `3px solid ${dangerInfo.color}`,
            padding: '10px 24px',
            marginBottom: '36px',
            letterSpacing: '2px',
            display: 'flex',
          }}
        >
          {dangerInfo.label}
        </div>

        {/* AI 코멘터리 */}
        {commentary ? (
          <div
            style={{
              fontSize: '13px',
              color: '#aaaaaa',
              maxWidth: '900px',
              textAlign: 'center',
              lineHeight: '1.8',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {`"${commentary}"`}
          </div>
        ) : null}

        {/* 마스코트 자리 (나중에 추가) */}
        {/* <img src="https://www.earthdoomindex.com/mascot.png"
              style={{ position: 'absolute', bottom: '40px', right: '60px', width: '120px', height: '120px' }} /> */}

        {/* 우하단 도메인 워터마크 */}
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            right: '40px',
            fontSize: '11px',
            color: '#444444',
            display: 'flex',
          }}
        >
          earthdoomindex.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
    }
  )

  return new Response(imageResponse.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 's-maxage=86400, stale-while-revalidate',
    },
  })
}
```

- [ ] **Step 3: 로컬에서 엔드포인트 확인**

Vercel CLI가 없다면 먼저 설치:
```bash
npm install -g vercel
```

프로젝트 루트(`edi-frontend/`)에서:
```bash
vercel dev
```

브라우저에서 `http://localhost:3000/api/og` 접속.
Expected: 1200×630 PNG 이미지가 렌더링됨 (점수가 있으면 점수, 없으면 타이틀만)

> **Note:** `VITE_API_URL`이 로컬 `.env`에 설정되어 있어야 백엔드 데이터를 가져올 수 있음. 미설정 시 폴백 이미지(타이틀만) 표시 — 정상 동작.

- [ ] **Step 4: 커밋**

```bash
git add edi-frontend/api/og.jsx
git commit -m "feat: add Vercel Edge Function for dynamic OG image"
```

---

## Task 4: `index.html` 메타 태그 업데이트

**Files:**
- Modify: `edi-frontend/index.html`

- [ ] **Step 1: `og:image` 메타 태그 추가**

`index.html`의 `<meta property="og:url" ...>` 바로 뒤에 추가:

```html
<meta property="og:image" content="https://www.earthdoomindex.com/api/og" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

- [ ] **Step 2: Twitter Card 타입 변경 + 이미지 추가**

기존:
```html
<meta name="twitter:card" content="summary" />
```

변경 후:
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://www.earthdoomindex.com/api/og" />
```

- [ ] **Step 3: 커밋**

```bash
git add edi-frontend/index.html
git commit -m "feat: add dynamic og:image and update twitter card meta tags"
```

---

## Task 5: `ShareButtons` 컴포넌트 + 스타일 추가

**Files:**
- Modify: `edi-frontend/src/App.jsx`
- Modify: `edi-frontend/src/App.css`

- [ ] **Step 1: `App.jsx`에 `ShareButtons` 컴포넌트 추가**

`App.jsx`의 `TopNav` 함수 정의 바로 위에 아래 컴포넌트를 추가한다:

```jsx
function ShareButtons({ score, dangerLabel, lang }) {
  const [copied, setCopied] = useState(false)
  const t = translations[lang].share
  const shareUrl = 'https://www.earthdoomindex.com'
  const tweetText = lang === 'ko'
    ? `오늘 지구 멸망 지수: ${score}점 — ${dangerLabel}`
    : `Today's Earth Doom Index: ${score}/100 — ${dangerLabel}`
  const twitterUrl =
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) {
      // clipboard 접근 실패 시 무시
    }
  }

  return (
    <div className="share-buttons">
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="nes-btn is-primary share-btn"
      >
        𝕏 {t.twitter}
      </a>
      <button className="nes-btn share-btn" onClick={handleCopy}>
        {copied ? t.copied : t.copy}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: `App` 함수 내 총점 섹션에 `ShareButtons` 삽입**

`App.jsx`의 총점 섹션 (`title-section`) 안에서 `<p className="game-date">` 바로 뒤에 추가한다:

```jsx
<p className="game-date">{dateStr}</p>
<ShareButtons score={data.total_score} dangerLabel={dangerLabel} lang={lang} />
```

- [ ] **Step 3: `App.css`에 공유 버튼 + 토스트 스타일 추가**

`App.css` 맨 아래에 추가:

```css
/* ───── 공유 버튼 ───── */
.share-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
  flex-wrap: wrap;
}

.share-btn {
  font-size: 9px !important;
  padding: 6px 14px !important;
  text-decoration: none !important;
}
```

- [ ] **Step 4: 커밋**

```bash
git add edi-frontend/src/App.jsx edi-frontend/src/App.css
git commit -m "feat: add ShareButtons component with Twitter share and copy link"
```

---

## Task 6: 최종 검증

- [ ] **Step 1: 프론트엔드 로컬 실행**

```bash
cd edi-frontend
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

확인:
- 총점 카드 하단에 `𝕏 트위터 공유` + `링크 복사` 버튼 두 개 노출
- 트위터 버튼 클릭 → `twitter.com/intent/tweet` 새 탭 열림, URL에 점수와 레벨이 포함됨
- 링크 복사 버튼 클릭 → 버튼 텍스트가 "복사됨!" 으로 2초간 변경 후 복귀

- [ ] **Step 2: OG 이미지 엔드포인트 확인**

`vercel dev` 실행 후 `http://localhost:3000/api/og` 브라우저로 접속.

확인:
- 1200×630 PNG 이미지 렌더링
- 점수, 위험 레벨, 코멘터리 표시

- [ ] **Step 3: Vercel 배포 후 Twitter Card 검증**

배포 완료 후 [Twitter Card Validator](https://cards-dev.twitter.com/validator)에서 `https://www.earthdoomindex.com` 입력.

확인:
- `summary_large_image` 카드 타입으로 인식
- OG 이미지(점수 반영)가 미리보기에 표시
