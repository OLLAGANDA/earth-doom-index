import { useState, useEffect } from 'react'
import './App.css'
import DoomChart from './DoomChart.jsx'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''
const API_URL = `${BASE_URL}/api/today-doom`

function useDoomData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDoom = async () => {
      try {
        const res = await fetch(API_URL)
        if (!res.ok) throw new Error(`서버 오류: ${res.status}`)
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDoom()
  }, [])

  return { data, loading, error }
}

function useDoomHistory() {
  const [historyData, setHistoryData] = useState([])

  useEffect(() => {
    fetch(`${BASE_URL}/api/doom-history?days=30`)
      .then(res => {
        if (!res.ok) {
          console.error(`doom-history fetch failed: ${res.status}`)
          return []
        }
        return res.json()
      })
      .then(json => setHistoryData(Array.isArray(json) ? json : []))
      .catch(err => {
        console.error('doom-history fetch error:', err)
        setHistoryData([])
      })
  }, [])

  return historyData
}

function scoreColor(score, max) {
  const ratio = score / max
  if (ratio >= 0.6) return 'is-error'
  if (ratio >= 0.3) return 'is-warning'
  return 'is-success'
}

function dangerLevel(score) {
  if (score >= 70) return { label: 'CRITICAL', cls: 'is-error blink' }
  if (score >= 50) return { label: 'DANGER',   cls: 'is-error' }
  if (score >= 30) return { label: 'CAUTION',  cls: 'is-warning' }
  return           { label: 'SAFE',     cls: 'is-success' }
}


const CARD_INFO = {
  society: {
    title: '🏙 SOCIETY',
    desc: '사회 불안 지수. GDELT 뉴스 데이터를 기반으로 전 세계 사회적 갈등, 시위, 분쟁 이벤트의 빈도와 강도를 측정합니다.',
    source: 'GDELT Project',
    max: 30,
  },
  climate: {
    title: '🌡 CLIMATE',
    desc: '기후 위협 지수. OpenWeather API를 기반으로 극단적 기상 현상, 이상 기온, 폭풍 등의 위협 수준을 측정합니다.',
    source: 'OpenWeather API',
    max: 30,
  },
  economy: {
    title: '📈 ECONOMY',
    desc: '경제 위협 지수. 글로벌 금융 시장 지표를 기반으로 경기 침체, 시장 불안정성, 인플레이션 위험을 측정합니다.',
    source: 'Yahoo Finance API',
    max: 30,
  },
  solar: {
    title: '☀ SOLAR STORM',
    desc: '태양 폭풍 지수. 태양 흑점 활동 및 지자기 폭풍 데이터를 기반으로 우주 기상이 지구에 미치는 위협을 측정합니다.',
    source: 'NOAA SWPC',
    max: 10,
  },
}

function DeltaBadge({ value }) {
  if (value === null || value === undefined) return null
  if (value > 0) return <span className="card-delta delta-up">+{value} ▲</span>
  if (value < 0) return <span className="card-delta delta-down">{value} ▽</span>
  return <span className="card-delta delta-zero">±0</span>
}

function TopNav() {
  return (
    <nav className="top-nav">
      <span className="nav-brand">
        EARTH DOOM INDEX
      </span>
    </nav>
  )
}

function App() {
  const { data, loading, error } = useDoomData()
  const historyData = useDoomHistory()

  // historyData는 target_date 오름차순 정렬 기준 — 마지막 항목=오늘, 그 전=어제
  const yesterday = historyData.length >= 2 ? historyData[historyData.length - 2] : null

  function delta(todayVal, key) {
    if (!yesterday || todayVal == null || yesterday[key] == null) return null
    return Math.round(todayVal - yesterday[key])
  }

  const [showTerms, setShowTerms] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)

  if (loading) {
    return (
      <>
        <TopNav />
        <div className="screen-center">
          <div className="nes-container is-dark">
            <p className="nes-text is-primary blink">🌍 LOADING...</p>
            <p className="sub-text">지구 멸망 지수 계산 중</p>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <TopNav />
        <div className="screen-center">
          <div className="nes-container is-dark is-rounded">
            <p className="nes-text is-error">⚠ SYSTEM ERROR</p>
            <p className="sub-text">{error}</p>
          </div>
        </div>
      </>
    )
  }

  if (data?.message) {
    return (
      <>
        <TopNav />
        <div className="screen-center">
          <div className="nes-container is-dark">
            <p className="nes-text is-warning">NO DATA</p>
            <p className="sub-text">{data.message}</p>
          </div>
        </div>
      </>
    )
  }

  const totalColor = scoreColor(data.total_score ?? 0, 100)
  const { label: dangerLabel, cls: dangerCls } = dangerLevel(data.total_score ?? 0)
  const rawDate = new Date(data.target_date)
  const dateStr = isNaN(rawDate.getTime()) ? '-' : rawDate.toLocaleDateString('ko-KR')

  return (
    <>
    <TopNav />
    <div className="game-screen">

      {/* 상단: 타이틀 + 총점 */}
      <section className="nes-container is-dark with-title title-section">
        <p className="game-subtitle">EARTH DOOM INDEX</p>
        <p className={`total-score nes-text ${totalColor}`}>
          {data.total_score}
          <span className="score-max"> / 100</span>
        </p>
        <p className={`danger-badge nes-text ${dangerCls}`}>{dangerLabel}</p>
        <p className="game-date">{dateStr}</p>
      </section>

      {/* 중단: AI 코멘터리 대화창 */}
      <section className="commentary-section">
        <div className="nes-container is-dark with-title">
          <p className="title">🤖 DOOM-9000</p>
          <div className="commentary-body">
            <p className="commentary-text">{data.ai_commentary ?? '해설 데이터 없음'}</p>
          </div>
        </div>
      </section>

      {/* 하단: 개별 지표 카드 4개 */}
      <section className="score-cards">
        <div
          className="nes-container is-dark with-title score-card"
          onClick={() => setSelectedCard('society')}
          style={{ cursor: 'pointer' }}
        >
          <p className="title">🏙society</p>
          <p className={`card-score nes-text ${scoreColor(data.society_score, 30)}`}>
            {data.society_score}
          </p>
          <p className="card-max">/ 30</p>
          <DeltaBadge value={delta(data.society_score, 'society_score')} />
        </div>

        <div
          className="nes-container is-dark with-title score-card"
          onClick={() => setSelectedCard('climate')}
          style={{ cursor: 'pointer' }}
        >
          <p className="title">🌡climate</p>
          <p className={`card-score nes-text ${scoreColor(data.climate_score, 30)}`}>
            {data.climate_score}
          </p>
          <p className="card-max">/ 30</p>
          <DeltaBadge value={delta(data.climate_score, 'climate_score')} />
        </div>

        <div
          className="nes-container is-dark with-title score-card"
          onClick={() => setSelectedCard('economy')}
          style={{ cursor: 'pointer' }}
        >
          <p className="title">📈economy</p>
          <p className={`card-score nes-text ${scoreColor(data.economy_score, 30)}`}>
            {data.economy_score}
          </p>
          <p className="card-max">/ 30</p>
          <DeltaBadge value={delta(data.economy_score, 'economy_score')} />
        </div>

        <div
          className="nes-container is-dark with-title score-card"
          onClick={() => setSelectedCard('solar')}
          style={{ cursor: 'pointer' }}
        >
          <p className="title">☀SOLAR</p>
          <p className={`card-score nes-text ${scoreColor(data.solar_score, 10)}`}>
            {data.solar_score ?? 0}
          </p>
          <p className="card-max">/ 10</p>
          <DeltaBadge value={delta(data.solar_score, 'solar_score')} />
        </div>
      </section>

      {/* 트렌드 차트 */}
      <DoomChart historyData={historyData} />

      {/* 푸터 */}
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
          <button className="terms-btn" onClick={() => setShowTerms(true)}>이용약관</button>
        </div>
      </footer>

      {selectedCard && (
        <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="modal-box nes-container is-dark" onClick={e => e.stopPropagation()}>
            <p className="title">{CARD_INFO[selectedCard].title}</p>
            <div className="modal-content">
              <p>{CARD_INFO[selectedCard].desc}</p>
              <p className="card-info-source">
                출처: {CARD_INFO[selectedCard].source} &nbsp;|&nbsp; 최대: {CARD_INFO[selectedCard].max}점
              </p>
            </div>
            <button
              className="nes-btn is-error modal-close"
              onClick={() => setSelectedCard(null)}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {showTerms && (
        <div className="modal-overlay" onClick={() => setShowTerms(false)}>
          <div className="modal-box nes-container is-dark" onClick={e => e.stopPropagation()}>
            <p className="title">이용약관</p>
            <div className="modal-content">
              <p>1. 본 서비스는 순수한 재미를 위한 토이 프로젝트입니다.</p>
              <p>2. 표시되는 지수는 실제 지구 위험도와 무관하며, 어떠한 과학적·법적 근거도 없습니다.</p>
              <p>3. 본 서비스의 정보를 실제 의사결정에 활용하지 마세요.</p>
              <p>4. 서비스는 예고 없이 변경되거나 종료될 수 있습니다.</p>
              <p>5. 진지하게 받아들이지 마세요. 지구는 (아마도) 괜찮습니다.</p>
            </div>
            <button className="nes-btn is-error modal-close" onClick={() => setShowTerms(false)}>닫기</button>
          </div>
        </div>
      )}

    </div>
    </>
  )
}

export default App
