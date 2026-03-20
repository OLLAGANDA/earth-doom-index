# DoomIndex Project

## 프로젝트 개요

**Earth Doom Index** - 지구 위협 지수를 수집·제공하는 API 서비스.

## 구조

```
DoomIndex/
└── edi-backend/        # Express.js API 서버
    ├── index.js        # 서버 진입점, 라우트, 크론 스케줄러
    ├── gdeltService.js # 사회 위협 지수 (GDELT)
    ├── climateService.js # 기후 위협 지수 (OpenWeather)
    ├── economyService.js # 경제 위협 지수
    ├── solarService.js # 태양 위협 지수
    ├── aiService.js    # AI 해설 생성 (Gemini)
    ├── testRunner.js   # 서비스 테스트 실행기
    ├── Dockerfile
    ├── docker-compose.yml
    └── package.json
```

## 기술 스택

- **Runtime**: Node.js
- **Framework**: Express.js v5
- **Database**: PostgreSQL 15 (Docker)
- **Infrastructure**: Docker Compose + Cloudflare Tunnel

## 개발 환경 실행

```bash
cd edi-backend

# Docker로 실행 (API + DB)
docker compose up -d

# 로그 확인
docker compose logs -f edi-api
```

## 환경 변수 (`.env`)

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

## 포트

| 서비스 | 포트 | 용도 |
|--------|------|------|
| edi-api | 3000 | Cloudflare Tunnel 연결 |
| edi-db | 5432 | 로컬 DB 툴 접속 (서버 UFW로 외부 차단) |

## 주요 API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/today-doom` | 최신 멸망 지수 조회 |
| GET | `/api/doom-history?days=N` | 과거 기록 조회 (기본 7일, 최대 30일) |

## 주의사항

- `.env` 파일은 절대 커밋하지 않는다.
- DB 데이터는 `edi-db-data` named volume에 영구 보존된다.
- `docker compose down -v`는 데이터 삭제 위험 — 사용 전 확인 필수.
