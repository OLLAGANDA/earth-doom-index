# DoomIndex Project

## 프로젝트 개요

**Earth Doom Index** - 지구 위협 지수를 수집·계산해 제공하는 서비스. 백엔드 API + 레트로 UI 프론트엔드로 구성.

## 구조

```
DoomIndex/
├── edi-backend/            # Express.js API 서버
│   ├── index.js            # 서버 진입점, 미들웨어, 라우트 마운트
│   ├── scheduler.js        # 크론 스케줄러 (일일 멸망 지수 계산)
│   ├── testRunner.js       # 서비스 dry-run 테스트 실행기
│   ├── routes/
│   │   └── doom.js         # /api/today-doom, /api/doom-history 라우트
│   ├── services/
│   │   ├── societyService.js # 사회 위협 지수 (GDELT, CAMEO 가중합산)
│   │   ├── climateService.js # 기후 위협 지수 (OpenWeather)
│   │   ├── economyService.js # 경제 위협 지수 (Yahoo Finance)
│   │   ├── solarService.js   # 태양 위협 지수 (NOAA SWPC)
│   │   └── aiService.js      # AI 해설 생성 (Gemini)
│   ├── db/
│   │   └── index.js        # PostgreSQL Pool, doom_records CRUD
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json
└── edi-frontend/           # React + Vite 프론트엔드
    ├── api/
    │   └── og.js           # Vercel Edge OG 이미지 생성 (@vercel/og)
    └── src/
        ├── main.jsx        # React 진입점
        ├── App.jsx         # 메인 컴포넌트 (데이터 fetch, 레이아웃)
        ├── App.css         # 스타일 (nes.css 기반, 반응형)
        ├── index.css       # 전역 스타일
        ├── i18n.js         # ko/en 번역 사전
        └── DoomChart.jsx   # 트렌드 차트 (recharts)
```

## 기술 스택

**백엔드**
- Runtime: Node.js / Express.js v5
- Database: PostgreSQL 15 (Docker)
- 인프라: Docker Compose + Cloudflare Tunnel

**프론트엔드**
- React + Vite, nes.css, recharts
- 배포: Vercel
- 환경 변수: `VITE_API_URL` (API 서버 주소)

## 개발 환경 실행

```bash
# 백엔드 (API + DB) — 홈서버 운영용
cd edi-backend
docker compose up -d
docker compose logs -f edi-api

# 로컬 개발용 DB만 띄우기 (포트 5432)
cd edi-backend
docker compose -f docker-compose.local.yml up -d

# 프론트엔드
cd edi-frontend
npm run dev
```

## 환경 변수

**백엔드** (`.env`)
```
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_HOST=edi-db
PORT=3000
OPENWEATHER_API_KEY=
GEMINI_API_KEY=
CLOUDFLARE_TUNNEL_TOKEN=
```

**프론트엔드** (`.env`)
```
VITE_API_URL=   # 백엔드 API 주소 (미설정 시 동일 origin)
```

## 포트

| 서비스 | 포트 | 용도 |
|--------|------|------|
| edi-api | 3000 | Cloudflare Tunnel 연결 |
| edi-db (운영) | 5433 | 홈서버 운영 DB (`docker-compose.yml`) |
| edi-db-local (개발) | 5432 | 로컬 개발 DB (`docker-compose.local.yml`) |

## 주요 API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/today-doom` | 최신 멸망 지수 조회 |
| GET | `/api/doom-history?days=N` | 과거 기록 조회 (기본 7일, 최대 30일) |

## 주의사항

- `.env` 파일은 절대 커밋하지 않는다.
- DB 데이터는 `edi-db-data` named volume에 영구 보존된다.
- `docker compose down -v`는 데이터 삭제 위험 — 사용 전 확인 필수.
