# OG 이미지 동적 생성 + 링크 공유 기능 설계

## 개요

SNS 링크 공유 시 오늘의 지구 멸망 지수를 반영한 이미지가 미리보기에 자동 표시되도록 한다.
공유 버튼(트위터, 링크 복사)을 메인 점수 카드 하단에 노출해 수동적 바이럴을 유도한다.

---

## 범위

- OG 이미지: 동적 생성 (점수/레벨/코멘터리 반영)
- `og:title`, `og:description`: 정적 유지 (동적 메타 태그 주입은 이번 범위 외)
- 공유 플랫폼: 트위터(X), 링크 복사

---

## 1. OG 이미지 Edge Function

**파일:** `edi-frontend/api/og.jsx` (신규)

Vercel은 `api/` 폴더의 파일을 자동으로 Edge Function으로 인식한다.

### 동작 흐름

1. SNS 크롤러가 `og:image` URL(`https://www.earthdoomindex.com/api/og`) 요청
2. Edge Function이 백엔드 `GET /api/today-doom` 호출
3. `total_score`, `dangerLevel`, `ai_commentary_en`, `target_date` 추출
4. `@vercel/og`의 `ImageResponse`로 1200×630 PNG 렌더링
5. `Cache-Control: s-maxage=86400, stale-while-revalidate` 헤더로 반환

### 이미지 콘텐츠

```
┌─────────────────────────────────────────┐
│  EARTH DOOM INDEX          2026.04.24   │
│                                         │
│              63 / 100                   │
│           ⚠️  DANGER                    │
│                                         │
│  "Solar wind at record levels..."       │
│                                         │
│  [마스코트 자리 - 나중에 추가]           │
└─────────────────────────────────────────┘
```

- 다크 배경, `Press Start 2P` 폰트 (Google Fonts fetch)
- 점수 색상: `dangerLevel`에 따라 초록/노랑/주황/빨강 (≥86 빨강, ≥71 빨강, ≥51 주황, ≥31 노랑, ≥16 연두, 나머지 초록 — `App.jsx`의 `dangerLevel()` 함수 로직과 동일하게 적용)
- 코멘터리: `ai_commentary_en` 사용 (영문, 80자 초과 시 truncate)

### 에러 처리

백엔드 API 호출 실패 시 점수 없이 "EARTH DOOM INDEX" 텍스트만 표시하는 폴백 이미지 반환.
에러를 throw하지 않아 OG 이미지 실패가 페이지 로드에 영향을 주지 않는다.

### 마스코트 확장 포인트

```jsx
// og.jsx 내 주석으로 자리 표시
{/* TODO: mascot — <img src="https://www.earthdoomindex.com/mascot.png" /> */}
{/* 마스코트 PNG를 public/ 폴더에 추가하면 절대 URL로 참조 가능 */}
```

---

## 2. index.html 수정

```html
<!-- 추가 -->
<meta property="og:image" content="https://www.earthdoomindex.com/api/og" />

<!-- 변경: summary → summary_large_image -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://www.earthdoomindex.com/api/og" />
```

`summary_large_image`로 변경해야 트위터에서 이미지가 크게 표시된다.

---

## 3. 공유 버튼

**위치:** 총점 섹션(`title-section`) 하단

### 트위터 공유

```
window.open(
  'https://twitter.com/intent/tweet?text=오늘 지구 멸망 지수: {score}점 — {dangerLabel}&url=https://earthdoomindex.com',
  '_blank'
)
```

트위터 크롤러가 URL을 스크랩하면 `og:image`의 동적 이미지가 미리보기에 표시된다.

### 링크 복사

```
navigator.clipboard.writeText('https://www.earthdoomindex.com')
```

복사 성공 시 "복사됨!" 토스트 2초 표시 후 자동 소멸.

### 토스트

별도 라이브러리 없이 `useState` + CSS transition으로 구현. nes.css 다크 스타일 통일.

---

## 4. 변경 파일 요약

| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| `edi-frontend/api/og.jsx` | 신규 | Edge Function, PNG 생성 |
| `edi-frontend/index.html` | 수정 | og:image, twitter:card 2줄 |
| `edi-frontend/src/App.jsx` | 수정 | ShareButtons 컴포넌트 추가 |
| `edi-frontend/src/App.css` | 수정 | 공유 버튼, 토스트 스타일 |
| `edi-frontend/package.json` | 수정 | `@vercel/og` 의존성 추가 |

---

## 5. 의존성

```
@vercel/og  (edi-frontend에 추가)
```

외 추가 라이브러리 없음.

---

## 6. 캐시 전략

- Edge Function 응답: `Cache-Control: s-maxage=86400, stale-while-revalidate`
- 하루 한 번 점수가 갱신되므로 24시간 캐시가 적절
- 점수 급변 시 캐시가 남아있을 수 있으나 허용 가능한 수준
