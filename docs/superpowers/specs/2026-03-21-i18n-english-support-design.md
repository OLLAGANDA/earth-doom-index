# i18n English Language Support — Design Spec

**Date:** 2026-03-21
**Project:** Earth Doom Index
**Scope:** Korean/English bilingual support for UI and AI commentary

---

## Summary

Add English language support to the Earth Doom Index service. Korean users (detected via `navigator.language`) see the existing Korean UI; all others see an English UI. A KO/EN toggle button allows manual override. AI commentary is generated in both languages daily at cron time and stored in separate DB columns. Numeric data and scores are shared.

---

## Architecture

### What Changes

**Backend:**
- `db/index.js` — add `ai_commentary_en` column via `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, run on `initDB()`
- `services/aiService.js` — add English prompt builder and parallel generation, rename export to `generateCommentaries()` returning `{ ko, en }`
- `scheduler.js` — destructure `{ ko, en }` from `generateCommentaries()`, pass both to `saveDoomRecord()`
- `db/index.js` `saveDoomRecord()` — accept and persist `commentaryEn` parameter

**Frontend:**
- `src/i18n.js` (new) — translation object `{ ko: {...}, en: {...} }` with all UI strings
- `src/App.jsx` — add `useLang` hook, apply `t = translations[lang]`, add language toggle to `TopNav`
- `src/App.css` — toggle button styles (retro nes.css aesthetic)

### What Does NOT Change

- API routes and response shape (existing fields unchanged; `ai_commentary_en` added to `today-doom` response automatically via `SELECT *`)
- `/api/doom-history` — does NOT include `ai_commentary_en`; the query selects only score columns explicitly (see `getDoomHistory` in `db/index.js`). No change needed.
- Score calculation logic
- Chart data (`doom-history` does not expose commentary)
- DB schema of existing rows (past `ai_commentary_en` values will be NULL)

---

## Backend Detail

### DB Migration

In `initDB()`, after the `CREATE TABLE IF NOT EXISTS` block:

```sql
ALTER TABLE doom_records
ADD COLUMN IF NOT EXISTS ai_commentary_en TEXT;
```

Runs on every server start; idempotent via `IF NOT EXISTS`. No separate migration script needed.

### `aiService.js`

- `buildPromptKo(data)` — existing Korean prompt (renamed from `buildPrompt`)
- `buildPromptEn(data)` — new English prompt:
  - DOOM-9000 persona: cynical, terse, retro 8-bit AI
  - Rules: exactly 3 lines, max 50 chars per line, English only, newline-separated
  - Tone guide mirrors Korean version (score-based: relaxed → warning → apocalyptic)
  - No additional client-side length enforcement; same approach as existing Korean commentary (AI is trusted to follow prompt constraints)
- `generateCommentaries(scoreData)` — calls both prompts via `Promise.all`, returns `{ ko, en }`. If either individual call throws, it is caught internally and returns `null` for that language (matching existing `generateCommentary` behavior). The record is still saved with whatever succeeded; the failed field is stored as NULL.

### `scheduler.js`

```js
const { ko: commentary, en: commentaryEn } = await generateCommentaries({...})
await saveDoomRecord({ ..., commentary, commentaryEn })
```

### `db/index.js` — `saveDoomRecord`

Add `commentaryEn` parameter. Include in INSERT and ON CONFLICT UPDATE:

```sql
INSERT INTO doom_records
  (..., ai_commentary, ai_commentary_en)
VALUES ($1, ..., $7, $8)
ON CONFLICT (target_date) DO UPDATE SET
  ...,
  ai_commentary    = EXCLUDED.ai_commentary,
  ai_commentary_en = EXCLUDED.ai_commentary_en
```

---

## Frontend Detail

### `src/i18n.js`

```js
export const translations = {
  ko: {
    loading: '지구 멸망 지수 계산 중',
    loadingTitle: '🌍 LOADING...',
    systemError: '⚠ SYSTEM ERROR',
    noData: 'NO DATA',
    noCommentary: '해설 데이터 없음',
    terms: '이용약관',
    termsClose: '닫기',
    cardInfoSource: (source, max) => `출처: ${source} | 최대: ${max}점`,
    dateLocale: 'ko-KR',
    cards: {
      society: { desc: '사회 불안 지수. GDELT 뉴스 데이터를 기반으로 전 세계 사회적 갈등, 시위, 분쟁 이벤트의 빈도와 강도를 측정합니다.', source: 'GDELT Project' },
      climate: { desc: '기후 위협 지수. OpenWeather API를 기반으로 극단적 기상 현상, 이상 기온, 폭풍 등의 위협 수준을 측정합니다.', source: 'OpenWeather API' },
      economy: { desc: '경제 위협 지수. 글로벌 금융 시장 지표를 기반으로 경기 침체, 시장 불안정성, 인플레이션 위험을 측정합니다.', source: 'Yahoo Finance API' },
      solar:   { desc: '태양 폭풍 지수. 태양 흑점 활동 및 지자기 폭풍 데이터를 기반으로 우주 기상이 지구에 미치는 위협을 측정합니다.', source: 'NOAA SWPC' },
    },
    termsContent: [
      '1. 본 서비스는 순수한 재미를 위한 토이 프로젝트입니다.',
      '2. 표시되는 지수는 실제 지구 위험도와 무관하며, 어떠한 과학적·법적 근거도 없습니다.',
      '3. 본 서비스의 정보를 실제 의사결정에 활용하지 마세요.',
      '4. 서비스는 예고 없이 변경되거나 종료될 수 있습니다.',
      '5. 진지하게 받아들이지 마세요. 지구는 (아마도) 괜찮습니다.',
    ],
  },
  en: {
    loading: 'Calculating Earth Doom Index...',
    loadingTitle: '🌍 LOADING...',
    systemError: '⚠ SYSTEM ERROR',
    noData: 'NO DATA',
    noCommentary: 'No commentary available.',
    terms: 'Terms of Service',
    termsClose: 'Close',
    cardInfoSource: (source, max) => `Source: ${source} | Max: ${max}pts`,
    dateLocale: 'en-US',
    cards: {
      society: { desc: 'Social unrest index. Measures frequency and intensity of global conflicts, protests, and dispute events based on GDELT news data.', source: 'GDELT Project' },
      climate: { desc: 'Climate threat index. Measures threat level of extreme weather events, temperature anomalies, and storms via OpenWeather API.', source: 'OpenWeather API' },
      economy: { desc: 'Economic threat index. Measures recession risk, market instability, and inflation danger based on global financial market indicators.', source: 'Yahoo Finance API' },
      solar:   { desc: 'Solar storm index. Measures space weather threats to Earth based on sunspot activity and geomagnetic storm data.', source: 'NOAA SWPC' },
    },
    termsContent: [
      '1. This is a toy project made purely for fun.',
      '2. The displayed index has no relation to actual Earth danger and has no scientific or legal basis.',
      '3. Do not use this information for real decision-making.',
      '4. The service may change or shut down without notice.',
      '5. Don\'t take it seriously. Earth is (probably) fine.',
    ],
  },
}
```

### `useLang` Hook (inside `App.jsx`)

```js
function useLang() {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('edi-lang')
    if (saved === 'ko' || saved === 'en') return saved
    return navigator.language.startsWith('ko') ? 'ko' : 'en'
  })
  const toggle = () => setLang(l => {
    const next = l === 'ko' ? 'en' : 'ko'
    localStorage.setItem('edi-lang', next)
    return next
  })
  return { lang, toggle }
}
```

### Language Toggle in `TopNav`

```jsx
function TopNav({ lang, onToggle }) {
  return (
    <nav className="top-nav">
      <span className="nav-brand">EARTH DOOM INDEX</span>
      <button className="lang-toggle" onClick={onToggle}>
        <span className={lang === 'ko' ? 'nes-text is-primary' : ''}>KO</span>
        {' / '}
        <span className={lang === 'en' ? 'nes-text is-primary' : ''}>EN</span>
      </button>
    </nav>
  )
}
```

### AI Commentary Display

```jsx
<p className="commentary-text">
  {lang === 'ko'
    ? (data.ai_commentary ?? t.noCommentary)
    : (data.ai_commentary_en ?? t.noCommentary)}
</p>
```

### Date Formatting

```js
const dateStr = isNaN(rawDate.getTime()) ? '-' : rawDate.toLocaleDateString(t.dateLocale)
```

---

## Past Data

Existing rows will have `ai_commentary_en = NULL`. English users viewing past entries (not exposed in chart; only today's record shows commentary) will see the `noCommentary` fallback string. No backfill required.

---

## UI String Coverage

All hardcoded Korean strings in `App.jsx` are covered by `i18n.js`. Strings that are already English and unchanged: `EARTH DOOM INDEX` (brand/title), `GITHUB`, `CONTACT`, `© 2026 EARTH DOOM INDEX`, score labels (`CRITICAL`, `DANGER`, `CAUTION`, `SAFE`), card titles (`SOCIETY`, `CLIMATE`, `ECONOMY`, `SOLAR STORM`), `DOOM-9000`, score display (`/ 100`, `/ 30`, `/ 10`). These are intentionally kept as English in both locales — they are part of the retro game aesthetic.

The `noData` key is used in the `data?.message` fallback screen (when no doom record exists yet), displayed as the screen-center message below `NO DATA`.

---

## Out of Scope

- More than 2 languages
- Server-side language negotiation (`Accept-Language` header)
- Accessibility improvements to the language toggle button
- Translation of chart axis labels (numeric only, no localization needed)
- Backfilling historical English commentary
- Timezone normalization for `target_date` display (existing behavior retained)
