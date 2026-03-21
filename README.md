# 🌍 Earth Doom Index

> **DOOM-9000이 매일 계산합니다. 오늘 지구는 얼마나 망했는가.**

지구 멸망 지수(EDI, Earth Doom Index)를 매일 자동으로 수집·계산하고 API로 제공하는 서비스입니다.
사회 불안, 기후 이상, 경제 변동성, 태양 활동 — 4가지 실시간 지표를 종합해 0~100점의 위협 점수를 산출하고,
레트로 8비트 AI **DOOM-9000**이 냉소적인 코멘터리를 남깁니다.

---

## 어떻게 계산하나요?

매일 UTC 00:01, 4개 지표를 병렬로 수집해 합산합니다.

| 지표 | 데이터 출처 | 측정 대상 | 점수 |
|------|------------|----------|------|
| **사회 (Society)** | GDELT V2 | 전쟁·테러·시위 등 글로벌 위협 이벤트 가중 합산 | 0–30점 |
| **기후 (Climate)** | OpenWeatherMap | 7개 거점 도시의 체감온도·극단 기상·대기질(AQI) | 0–30점 |
| **경제 (Economy)** | Yahoo Finance | S&P 500·금·WTI 원유 변동률 + VIX 공포지수 | 0–30점 |
| **태양 (Solar)** | NOAA SWPC | Kp 지자기 지수 + X선 플레어 강도 | 0–10점 |

총점이 계산되면 Gemini AI가 점수 구간에 맞는 톤으로 3줄 코멘터리를 생성합니다.

- **0–30점** : 냉소적 여유. *"아직은 버티는군."*
- **31–60점** : 경고성 냉담. *"가속 중임."*
- **61–100점** : 종말론적 선언. *"결과는 명백함."*

---

## 투표 시스템

매일 UTC 00:05 ~ 23:58, 사용자는 **내일 멸망 지수가 오를지/유지될지/내릴지** 익명으로 투표할 수 있습니다.

- 투표는 재선택 가능 (변경 시 이전 투표 자동 취소)
- 투표 결과는 다음 날 실제 점수 변동과 대조해 공개
- 로그인 없음, 계정 없음 — 브라우저 로컬스토리지로 중복 방지

---

## 아키텍처

```
외부 API                   edi-backend              클라이언트
─────────────────          ────────────────         ──────────
GDELT V2        ──┐
OpenWeatherMap  ──┤→  Services  →  Scheduler  →  PostgreSQL
Yahoo Finance   ──┤   (병렬수집)    (매일 00:01)
NOAA SWPC       ──┘                    ↓
Gemini API      ──────────────→  AI Commentary
                                       ↓
                               Express Routes  →  GET  /api/today-doom
                                                   GET  /api/doom-history
                                                   GET  /api/vote/today
                                                   POST /api/vote
                                                   DEL  /api/vote
```

Cloudflare Tunnel을 통해 외부에 안전하게 노출되며, DB 포트(5432)는 UFW로 외부 차단됩니다.

---

## 기술 스택

- **Runtime** : Node.js
- **Framework** : Express.js v5
- **Database** : PostgreSQL 15
- **AI** : Google Gemini API (`@google/genai`)
- **스케줄러** : node-cron (매일 UTC 00:01)
- **백엔드 인프라** : Docker Compose + Cloudflare Tunnel
- **프론트엔드 배포** : React + Vite, Vercel

---

## 실행 방법

**1. 환경 변수 설정**

```bash
cp .env.example .env
# .env 파일에 아래 값을 채워주세요
```

| 변수 | 설명 |
|------|------|
| `DB_USER` | PostgreSQL 사용자명 |
| `DB_PASSWORD` | PostgreSQL 비밀번호 |
| `DB_NAME` | 데이터베이스 이름 |
| `PORT` | API 서버 포트 (기본 3000) |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API 키 |
| `GEMINI_API_KEY` | Google Gemini API 키 |
| `CLOUDFLARE_TUNNEL_TOKEN` | Cloudflare Tunnel 토큰 |

**2. 실행**

```bash
cd edi-backend
docker compose up -d
```

API 서버(3000)와 PostgreSQL, Cloudflare Tunnel이 함께 시작됩니다.

> **주의:** `docker compose down -v`는 DB 데이터가 삭제됩니다. 데이터는 `edi-db-data` named volume에 보존됩니다.

---

## API

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/today-doom` | 가장 최근에 계산된 멸망 지수 1건 |
| `GET` | `/api/doom-history?days=N` | 최근 N일 이력 (기본 7일, 최대 30일) |
| `GET` | `/api/vote/today` | 오늘 투표 현황 + 어제 예측 결과 |
| `POST` | `/api/vote` | 투표 (`{ direction: "up"\|"flat"\|"down", target_date }`) |
| `DELETE` | `/api/vote` | 투표 취소 (`{ direction, target_date }`) |

---

*계산 완료. 결과는 명백함.*
