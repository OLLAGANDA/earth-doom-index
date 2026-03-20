# EDI Backend 리팩토링 설계

**날짜:** 2026-03-20
**범위:** edi-backend 디렉토리
**목표:** 유지보수성 향상을 위한 파일 구조 정리 및 책임 분리

---

## 배경

현재 `index.js`가 DB 초기화, 비즈니스 로직, 라우트 처리, 크론 스케줄링을 모두 담당하고 있어 유지보수가 어렵다. 또한 `runDoomCalculation` 로직이 `index.js`와 `testRunner.js`에 중복 존재한다.

---

## 최종 디렉토리 구조

```
edi-backend/
├── index.js              # 진입점: app 조립, DB 초기화, 서버 시작
├── scheduler.js          # runDoomCalculation export + registerCron export
├── testRunner.js         # scheduler.js의 runDoomCalculation 재사용
├── db/
│   └── index.js          # Pool 생성, initDB, DB 쿼리 함수
├── routes/
│   └── doom.js           # /api/today-doom, /api/doom-history 핸들러
└── services/
    ├── societyService.js # GDELT 사회 위협 지수 (gdeltService.js에서 이름 변경)
    ├── climateService.js
    ├── economyService.js
    ├── solarService.js
    └── aiService.js
```

---

## 파일별 책임

### `index.js` (수정)
- **첫 번째 줄에서** `require('dotenv').config()` 호출 — 이후 require되는 모든 모듈이 env 변수를 사용하므로 반드시 가장 먼저 실행
- Express 앱 생성 및 미들웨어 등록
- DB 초기화 호출
- 라우트 등록
- `registerCron()` 호출로 크론 활성화
- 서버 시작

15줄 내외로 슬림하게 유지.

### `db/index.js` (신규)
- `pg.Pool` 싱글톤 생성 및 export
- `initDB()`: doom_records 테이블 생성 및 solar_score 컬럼 마이그레이션
- `getDoomToday()`: 최신 1건 조회
- `getDoomHistory(days)`: 최근 N일 조회 (기본 7, 최대 30)
- `saveDoomRecord(data)`: UPSERT (target_date 기준 충돌 시 전체 갱신)

### `routes/doom.js` (신규)
- `GET /api/today-doom`: `getDoomToday()` 호출 후 응답
- `GET /api/doom-history`: days 파라미터 검증 후 `getDoomHistory(days)` 호출
- HTTP 레이어만 담당; 비즈니스 로직 없음
- **require 경로 예시**: `const { getDoomToday, getDoomHistory } = require('../db');`

### `scheduler.js` (신규)
두 가지 함수를 분리하여 export:

1. **`runDoomCalculation()`** — 4개 서비스 병렬 실행 → 점수 합산 → AI 코멘터리 → DB 저장. `testRunner.js`와 `registerCron()` 양쪽에서 import해 사용.
2. **`registerCron()`** — `node-cron`으로 매일 UTC 00:01에 `runDoomCalculation()` 등록. `index.js`에서만 호출.

**이 분리의 이유:** `require('./scheduler')`만으로 크론이 자동 등록되는 사이드이펙트를 방지. `testRunner.js`가 크론 없이 `runDoomCalculation()`만 가져올 수 있게 함.

```js
// 사용 예
// index.js: const { registerCron } = require('./scheduler'); registerCron();
// testRunner.js: const { runDoomCalculation } = require('./scheduler');
// scheduler.js 내 서비스 import 경로 예시:
//   const { calculateSocietyScore } = require('./services/societyService');
```

### `testRunner.js` (수정)
- **첫 번째 줄에서** `require('dotenv').config()` 유지 — `scheduler.js` → `db/index.js` → Pool 생성이 모듈 로드 시 발생하므로 dotenv가 먼저 실행되어야 함
- `scheduler.js`의 `runDoomCalculation()` import 후 직접 실행
- 중복 로직 제거
- **주의:** 리팩토링 후 `testRunner.js` 실행 시 DB 연결이 필요함 (현재도 DB 저장 로직이 `testRunner.js` 내에 있지는 않지만, `saveDoomRecord` 호출이 포함된 `runDoomCalculation`을 공유하므로 DB 필요)

### `services/societyService.js` (이름 변경)
- `gdeltService.js`를 `services/societyService.js`로 rename + 이동
- 파일 상단 주석 `// gdeltService.js` → `// societyService.js`로 업데이트 (유일한 내용 변경)
- export 함수명 `calculateSocietyScore` 유지

### `services/*` (이동)
- 나머지 서비스 파일은 `services/` 폴더로 이동
- 코드 내용 변경 없음; import 경로만 조정
- `aiService.js`의 `GoogleGenAI` 인스턴스는 모듈 로드 시 생성되므로, `index.js`/`testRunner.js`에서 dotenv가 먼저 실행되어야 함 (위 각 진입점에서 보장)

---

## 주석 전략

- **한국어** 사용
- 파일 상단: 해당 파일의 역할과 핵심 설계 결정을 2–3줄로 설명
- 인라인 주석: 비즈니스 로직의 "왜"만 설명 (자명한 코드 제외)
- 기존 서비스 파일 주석: 그대로 유지 (societyService.js 파일명 주석 제외)

---

## 변경 요약

| 항목 | 변경 유형 |
|------|----------|
| `index.js` | 수정 (슬림화, dotenv 첫 줄 보장) |
| `db/index.js` | 신규 생성 |
| `routes/doom.js` | 신규 생성 |
| `scheduler.js` | 신규 생성 (runDoomCalculation + registerCron 분리 export) |
| `testRunner.js` | 수정 (중복 제거, dotenv 첫 줄 유지) |
| `gdeltService.js` → `services/societyService.js` | 이름 변경 + 이동 + 파일명 주석 수정 |
| 나머지 `*Service.js` | `services/`로 이동 |

---

## 변경하지 않는 것

- 각 서비스 파일의 내부 로직 및 알고리즘
- API 엔드포인트 경로 및 응답 형식
- DB 스키마
- Docker 설정
- 환경 변수 구조
