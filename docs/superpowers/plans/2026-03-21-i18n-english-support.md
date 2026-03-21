# i18n English Language Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Korean/English bilingual support — auto-detect via `navigator.language`, manual KO/EN toggle, dual AI commentary stored in DB.

**Architecture:** Backend adds `ai_commentary_en` column and generates both commentaries in parallel at cron time. Frontend uses a `translations` object in `i18n.js` and a `useLang` hook for state, keeping all string management outside components.

**Tech Stack:** Node.js/Express, PostgreSQL, Gemini API (`@google/genai`), React + Vite, nes.css

**Spec:** `docs/superpowers/specs/2026-03-21-i18n-english-support-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `edi-backend/db/index.js` | Modify | Add `ai_commentary_en` column in `initDB()`, update `saveDoomRecord()` |
| `edi-backend/services/aiService.js` | Modify | Add English prompt, export `generateCommentaries()` returning `{ ko, en }` |
| `edi-backend/scheduler.js` | Modify | Use `generateCommentaries()`, pass both to `saveDoomRecord()` |
| `edi-frontend/src/i18n.js` | Create | All UI strings for both KO and EN locales |
| `edi-frontend/src/App.jsx` | Modify | `useLang` hook, `TopNav` toggle, all hardcoded strings → `t.*` |
| `edi-frontend/src/App.css` | Modify | `.lang-toggle` button styles |

---

## Task 1: DB — Add `ai_commentary_en` Column

**Files:**
- Modify: `edi-backend/db/index.js`

- [ ] **Step 1: Add ALTER TABLE to initDB()**

In `edi-backend/db/index.js`, inside `initDB()`, add the ALTER TABLE call after the CREATE TABLE query:

```js
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS doom_records (
        id SERIAL PRIMARY KEY,
        target_date DATE UNIQUE NOT NULL,
        society_score INTEGER NOT NULL,
        climate_score INTEGER NOT NULL,
        economy_score INTEGER NOT NULL,
        solar_score INTEGER NOT NULL DEFAULT 0,
        total_score INTEGER NOT NULL,
        ai_commentary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      ALTER TABLE doom_records
      ADD COLUMN IF NOT EXISTS ai_commentary_en TEXT
    `);
    console.log('✅ DB Schema is ready.');
  } catch (err) {
    console.error('❌ DB Initialization Error:', err);
    throw err;
  }
};
```

- [ ] **Step 2: Update saveDoomRecord() to accept and persist commentaryEn**

Replace the existing `saveDoomRecord` function:

```js
const saveDoomRecord = async ({
  targetDate,
  societyScore,
  climateScore,
  economyScore,
  solarScore,
  totalScore,
  commentary,
  commentaryEn,
}) => {
  await pool.query(
    `INSERT INTO doom_records
       (target_date, society_score, climate_score, economy_score, solar_score, total_score, ai_commentary, ai_commentary_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (target_date) DO UPDATE SET
       society_score    = EXCLUDED.society_score,
       climate_score    = EXCLUDED.climate_score,
       economy_score    = EXCLUDED.economy_score,
       solar_score      = EXCLUDED.solar_score,
       total_score      = EXCLUDED.total_score,
       ai_commentary    = EXCLUDED.ai_commentary,
       ai_commentary_en = EXCLUDED.ai_commentary_en`,
    [targetDate, societyScore, climateScore, economyScore, solarScore, totalScore, commentary, commentaryEn]
  );
};
```

- [ ] **Step 3: Verify DB migration and confirm column exists**

DB must be running (`cd edi-backend && docker compose up -d`), then:

```bash
cd edi-backend
node -e "require('dotenv').config(); const {initDB, pool} = require('./db'); initDB().then(() => pool.query(\"SELECT column_name FROM information_schema.columns WHERE table_name='doom_records' AND column_name='ai_commentary_en'\")).then(r => { console.log('Column found:', r.rows.length === 1); pool.end(); }).catch(e => { console.error(e); pool.end(); })"
```

Expected output:
```
✅ DB Schema is ready.
Column found: true
```

If column already exists, `IF NOT EXISTS` is a no-op — `Column found: true` still prints.

- [ ] **Step 4: Commit**

```bash
git add edi-backend/db/index.js
git commit -m "feat: add ai_commentary_en column to doom_records"
```

---

## Task 2: aiService — Add English Commentary Generation

**Files:**
- Modify: `edi-backend/services/aiService.js`

- [ ] **Step 1: Add getToneGuideEn() and buildPromptEn()**

Do NOT rename or modify the existing `buildPrompt()` or `getToneGuide()` functions — `generateCommentary()` depends on them and must stay working. Simply add new functions after the existing ones:

```js
const getToneGuideEn = (score) => {
  if (score <= 30) return 'Cynically relaxed tone. E.g. "Still holding together.", "Curious. Still alive."';
  if (score <= 60) return 'Cold warning tone. E.g. "Accelerating.", "Within predicted range.", "No anomalies. As expected."';
  return 'Apocalyptic declaration tone. E.g. "Calculation complete.", "The outcome is clear.", "No variables remain."';
};

const buildPromptEn = ({ totalScore, societySummary, climateSummary, economySummary, solarSummary }) => {
  const safe = (v) => (v != null && v !== '' ? v : 'No data');
  const toneGuide = getToneGuideEn(totalScore ?? 0);

  return `
You are DOOM-9000, a retro 8-bit AI designed to predict the collapse of human civilization.
Cynical, blunt, laced with dark humor.
Write a concise, impactful commentary in English based on today's Earth Doom Index (EDI) data.

[TODAY'S DATA]
- Total Earth Doom Index: ${totalScore ?? '?'} / 100
- Society: ${safe(societySummary)}
- Climate: ${safe(climateSummary)}
- Economy: ${safe(economySummary)}
- Solar Activity (SOLAR STORM): ${safe(solarSummary)}

[TONE GUIDE FOR TODAY]
Score ${totalScore ?? '?'} — ${toneGuide}

[RULES]
1. Exactly 3 lines.
2. Each line must be 50 characters or fewer.
3. The last line must be a one-line verdict on humanity.
4. No extra text, titles, explanations, or markdown.
5. Separate each line with a newline (\\n).
`.trim();
};
```

- [ ] **Step 2: Add generateCommentaries() and update exports**

Add the new function and update `module.exports`:

```js
const generateCommentaries = async (scoreData) => {
  const [ko, en] = await Promise.all([
    (async () => {
      try {
        const response = await ai.models.generateContent({
          model: MODEL,
          contents: buildPrompt(scoreData),
        });
        return response.text;
      } catch (error) {
        console.error('AI 코멘터리(KO) 생성 실패:', error.message);
        return null;
      }
    })(),
    (async () => {
      try {
        const response = await ai.models.generateContent({
          model: MODEL,
          contents: buildPromptEn(scoreData),
        });
        return response.text;
      } catch (error) {
        console.error('AI commentary (EN) generation failed:', error.message);
        return null;
      }
    })(),
  ]);
  return { ko, en };
};

module.exports = { generateCommentary, generateCommentaries };
```

The final `module.exports` must export **both** `generateCommentary` (existing — kept for any other callers) **and** `generateCommentaries` (new). The code above already does this correctly.

- [ ] **Step 3: Verify syntax**

```bash
cd edi-backend
node -e "require('dotenv').config(); const s = require('./services/aiService'); console.log(typeof s.generateCommentaries);"
```

Expected output: `function`

- [ ] **Step 4: Commit**

```bash
git add edi-backend/services/aiService.js
git commit -m "feat: add English AI commentary generation to aiService"
```

---

## Task 3: scheduler — Wire Up Dual Commentary

**Files:**
- Modify: `edi-backend/scheduler.js`

- [ ] **Step 1: Switch to generateCommentaries() in runDoomCalculation()**

Update the import and the commentary generation block in `scheduler.js`:

```js
// Change this import line:
const { generateCommentary } = require('./services/aiService');
// To:
const { generateCommentaries } = require('./services/aiService');
```

Then replace the commentary generation and saveDoomRecord call:

```js
// Replace:
const commentary = await generateCommentary({
  totalScore,
  societySummary: societyData.summary,
  climateSummary: climateData.summary,
  economySummary: economyData.summary,
  solarSummary: solarData.summary,
});
// ...
await saveDoomRecord({
  targetDate,
  societyScore: societyData.societyScore,
  climateScore: climateData.climateScore,
  economyScore: economyData.economyScore,
  solarScore: solarData.solarScore,
  totalScore,
  commentary,
});

// With:
const { ko: commentary, en: commentaryEn } = await generateCommentaries({
  totalScore,
  societySummary: societyData.summary,
  climateSummary: climateData.summary,
  economySummary: economyData.summary,
  solarSummary: solarData.summary,
});
// ...
await saveDoomRecord({
  targetDate,
  societyScore: societyData.societyScore,
  climateScore: climateData.climateScore,
  economyScore: economyData.economyScore,
  solarScore: solarData.solarScore,
  totalScore,
  commentary,
  commentaryEn,
});
```

Also update the dry run log to show both:

```js
// Replace:
console.log(`\n💬 AI Commentary:\n${commentary}`);
// With:
console.log(`\n💬 AI Commentary (KO):\n${commentary}`);
console.log(`\n💬 AI Commentary (EN):\n${commentaryEn}`);
```

- [ ] **Step 2: Run dry run to verify both commentaries generate**

```bash
cd edi-backend
node testRunner.js
```

Expected output includes both commentary blocks:
```
💬 AI Commentary (KO):
...한국어 3줄...

💬 AI Commentary (EN):
...3 lines in English...
```

If GEMINI_API_KEY is not set in `.env`, you'll get null for both — that's fine, it means the error handling works.

- [ ] **Step 3: Commit**

```bash
git add edi-backend/scheduler.js
git commit -m "feat: generate and store KO+EN AI commentary in scheduler"
```

---

## Task 4: Frontend — Create i18n.js

**Files:**
- Create: `edi-frontend/src/i18n.js`

- [ ] **Step 1: Create the translation file**

Create `edi-frontend/src/i18n.js` with the full translation object:

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
      society: {
        desc: '사회 불안 지수. GDELT 뉴스 데이터를 기반으로 전 세계 사회적 갈등, 시위, 분쟁 이벤트의 빈도와 강도를 측정합니다.',
        source: 'GDELT Project',
      },
      climate: {
        desc: '기후 위협 지수. OpenWeather API를 기반으로 극단적 기상 현상, 이상 기온, 폭풍 등의 위협 수준을 측정합니다.',
        source: 'OpenWeather API',
      },
      economy: {
        desc: '경제 위협 지수. 글로벌 금융 시장 지표를 기반으로 경기 침체, 시장 불안정성, 인플레이션 위험을 측정합니다.',
        source: 'Yahoo Finance API',
      },
      solar: {
        desc: '태양 폭풍 지수. 태양 흑점 활동 및 지자기 폭풍 데이터를 기반으로 우주 기상이 지구에 미치는 위협을 측정합니다.',
        source: 'NOAA SWPC',
      },
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
      society: {
        desc: 'Social unrest index. Measures frequency and intensity of global conflicts, protests, and dispute events based on GDELT news data.',
        source: 'GDELT Project',
      },
      climate: {
        desc: 'Climate threat index. Measures threat level of extreme weather events, temperature anomalies, and storms via OpenWeather API.',
        source: 'OpenWeather API',
      },
      economy: {
        desc: 'Economic threat index. Measures recession risk, market instability, and inflation danger based on global financial market indicators.',
        source: 'Yahoo Finance API',
      },
      solar: {
        desc: 'Solar storm index. Measures space weather threats to Earth based on sunspot activity and geomagnetic storm data.',
        source: 'NOAA SWPC',
      },
    },
    termsContent: [
      '1. This is a toy project made purely for fun.',
      '2. The displayed index has no relation to actual Earth danger and has no scientific or legal basis.',
      '3. Do not use this information for real decision-making.',
      '4. The service may change or shut down without notice.',
      "5. Don't take it seriously. Earth is (probably) fine.",
    ],
  },
}
```

- [ ] **Step 2: Lint check**

```bash
cd edi-frontend
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add edi-frontend/src/i18n.js
git commit -m "feat: add i18n translation object for KO and EN"
```

---

## Task 5: Frontend — useLang Hook and TopNav Toggle

**Files:**
- Modify: `edi-frontend/src/App.jsx`
- Modify: `edi-frontend/src/App.css`

- [ ] **Step 1: Add import and useLang hook to App.jsx**

At the top of `App.jsx`, add the import after the existing imports:

```js
import { translations } from './i18n.js'
```

Add `useLang` hook function before the `App` component (after `dangerLevel`):

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

- [ ] **Step 2: Update TopNav to accept lang and onToggle props**

Replace the existing `TopNav` component:

```jsx
function TopNav({ lang, onToggle }) {
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

- [ ] **Step 3: Add lang-toggle styles to App.css**

Open `edi-frontend/src/App.css` and add after the `.top-nav` block (find it by searching for `.top-nav`):

First, check the existing `.top-nav` styles in `App.css` (search for `.top-nav`). If it doesn't already use `display: flex`, add that and ensure the toggle sits on the right. The `.top-nav` rule should have:

```css
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* ...existing properties stay... */
}
```

Then add the toggle styles:

```css
.lang-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.75rem;
  color: var(--color-text, #fff);
  padding: 0;
  letter-spacing: 0.05em;
  margin-left: auto;
}

.lang-toggle:hover {
  opacity: 0.8;
}
```

If `.top-nav` already uses flex with `space-between`, `margin-left: auto` is redundant but harmless. Check the existing rule first and avoid duplicating flex properties.

- [ ] **Step 4: Lint check**

```bash
cd edi-frontend
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add edi-frontend/src/App.jsx edi-frontend/src/App.css
git commit -m "feat: add useLang hook and KO/EN toggle to TopNav"
```

---

## Task 6: Frontend — Apply Translations Throughout App.jsx

**Files:**
- Modify: `edi-frontend/src/App.jsx`

- [ ] **Step 1: Wire useLang into App component and derive t**

Inside the `App` function, add at the top:

```js
function App() {
  const { lang, toggle } = useLang()
  const t = translations[lang]
  const { data, loading, error } = useDoomData()
  // ... rest unchanged
```

- [ ] **Step 2: Pass lang and toggle to TopNav in all render paths**

There are four render paths (loading, error, no data, main). Update each `<TopNav />` to `<TopNav lang={lang} onToggle={toggle} />`.

- [ ] **Step 3: Replace hardcoded strings in loading screen**

```jsx
// Replace:
<p className="nes-text is-primary blink">🌍 LOADING...</p>
<p className="sub-text">지구 멸망 지수 계산 중</p>
// With:
<p className="nes-text is-primary blink">{t.loadingTitle}</p>
<p className="sub-text">{t.loading}</p>
```

- [ ] **Step 4: Replace hardcoded strings in error screen**

```jsx
// Replace:
<p className="nes-text is-error">⚠ SYSTEM ERROR</p>
// With:
<p className="nes-text is-error">{t.systemError}</p>
```

- [ ] **Step 5: Replace hardcoded strings in no-data screen**

```jsx
// Replace:
<p className="nes-text is-warning">NO DATA</p>
<p className="sub-text">{data.message}</p>
// With:
<p className="nes-text is-warning">{t.noData}</p>
<p className="sub-text">{data.message}</p>
```

(Note: `data.message` is from the API — it remains Korean from the backend. That's acceptable; it's a rare internal-only state.)

- [ ] **Step 6: Replace date formatting**

```js
// Replace:
const dateStr = isNaN(rawDate.getTime()) ? '-' : rawDate.toLocaleDateString('ko-KR')
// With:
const dateStr = isNaN(rawDate.getTime()) ? '-' : rawDate.toLocaleDateString(t.dateLocale)
```

- [ ] **Step 7: Replace AI commentary display**

```jsx
// Replace:
<p className="commentary-text">{data.ai_commentary ?? '해설 데이터 없음'}</p>
// With:
<p className="commentary-text">
  {lang === 'ko'
    ? (data.ai_commentary ?? t.noCommentary)
    : (data.ai_commentary_en ?? t.noCommentary)}
</p>
```

- [ ] **Step 8: Replace card modal content**

In the card modal, replace:

```jsx
// Replace:
<p>{CARD_INFO[selectedCard].desc}</p>
<p className="card-info-source">
  출처: {CARD_INFO[selectedCard].source} &nbsp;|&nbsp; 최대: {CARD_INFO[selectedCard].max}점
</p>
// With:
<p>{t.cards[selectedCard].desc}</p>
<p className="card-info-source">
  {t.cardInfoSource(CARD_INFO[selectedCard].source, CARD_INFO[selectedCard].max)}
</p>
```

Note: `CARD_INFO` still holds `source` and `max` (numbers) — we use `t.cards[selectedCard].desc` for the translated description. `CARD_INFO[selectedCard].source` in the cardInfoSource call can be replaced by `t.cards[selectedCard].source` since source names don't change between languages. Update accordingly:

```jsx
<p className="card-info-source">
  {t.cardInfoSource(t.cards[selectedCard].source, CARD_INFO[selectedCard].max)}
</p>
```

- [ ] **Step 9: Replace terms modal content**

```jsx
// Replace:
<p className="title">이용약관</p>
// With:
<p className="title">{t.terms}</p>

// Replace the terms content block:
<p>1. 본 서비스는 순수한 재미를 위한 토이 프로젝트입니다.</p>
<p>2. 표시되는 지수는 실제 지구 위험도와 무관하며, 어떠한 과학적·법적 근거도 없습니다.</p>
<p>3. 본 서비스의 정보를 실제 의사결정에 활용하지 마세요.</p>
<p>4. 서비스는 예고 없이 변경되거나 종료될 수 있습니다.</p>
<p>5. 진지하게 받아들이지 마세요. 지구는 (아마도) 괜찮습니다.</p>
// With:
{t.termsContent.map((line, i) => <p key={i}>{line}</p>)}

// Replace terms button:
<button className="nes-btn is-error modal-close" onClick={() => setShowTerms(false)}>닫기</button>
// With:
<button className="nes-btn is-error modal-close" onClick={() => setShowTerms(false)}>{t.termsClose}</button>

// Replace terms footer button:
<button className="terms-btn" onClick={() => setShowTerms(true)}>이용약관</button>
// With:
<button className="terms-btn" onClick={() => setShowTerms(true)}>{t.terms}</button>

// Replace card modal close button:
<button className="nes-btn is-error modal-close" onClick={() => setSelectedCard(null)}>닫기</button>
// With:
<button className="nes-btn is-error modal-close" onClick={() => setSelectedCard(null)}>{t.termsClose}</button>
```

- [ ] **Step 10: Remove CARD_INFO desc and source fields (no longer needed)**

First verify `CARD_INFO` is only used in `App.jsx`:

```bash
cd edi-frontend
grep -r "CARD_INFO" src/
```

Expected: only references in `src/App.jsx`. If so, safely remove `desc` and `source` from `CARD_INFO` since they are now in `t.cards[key]`:

```js
const CARD_INFO = {
  society: { title: '🏙 SOCIETY', max: 30 },
  climate: { title: '🌡 CLIMATE', max: 30 },
  economy: { title: '📈 ECONOMY', max: 30 },
  solar:   { title: '☀ SOLAR STORM', max: 10 },
}
```

If grep shows other usages, leave the fields in place.

- [ ] **Step 11: Lint check**

```bash
cd edi-frontend
npm run lint
```

Expected: no errors.

- [ ] **Step 12: Visual check in browser**

```bash
cd edi-frontend
npm run dev
```

Open `http://localhost:5173`. Verify:
- Language toggles between KO and EN
- All text changes (loading, errors, card modal descriptions, terms, dates)
- Refresh page: language preference persists
- First visit from non-Korean locale (or change `navigator.language` via DevTools override): defaults to English

- [ ] **Step 13: Commit**

```bash
git add edi-frontend/src/App.jsx
git commit -m "feat: apply i18n translations throughout App component"
```

---

## Task 7: Final Integration Check

- [ ] **Step 1: Backend — full dry run**

With DB running:

```bash
cd edi-backend
node testRunner.js
```

Verify both `AI Commentary (KO)` and `AI Commentary (EN)` appear in output.

- [ ] **Step 2: Frontend — production build check**

```bash
cd edi-frontend
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Final commit if any cleanup needed, then push**

```bash
git log --oneline -6
```

Confirm all feature commits are in order. Push when ready.
