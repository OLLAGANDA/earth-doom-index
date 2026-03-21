import { useState, useEffect } from 'react'
import './App.css'
import DoomChart from './DoomChart.jsx'
import { translations } from './i18n.js'

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

// todayDoomDate: data.target_date (서버 기준 오늘 날짜, 'YYYY-MM-DD')
// 반환: 'pending' | 'open' | 'closed'
function getVotePhase(todayDoomDate) {
  const now = new Date()
  const todayUTC = now.toISOString().slice(0, 10)

  if (todayDoomDate < todayUTC) return 'pending'   // 새 점수 미계산

  // todayDoomDate === todayUTC
  const utcHour = now.getUTCHours()
  const utcMin = now.getUTCMinutes()
  const totalMin = utcHour * 60 + utcMin
  if (totalMin < 5) return 'pending'               // 00:00~00:04 (계산 중)
  if (totalMin >= 23 * 60 + 59) return 'closed'   // 23:59 이후
  return 'open'
}

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

const VOTE_BASE_URL = `${BASE_URL}/api/vote`

function useVote(todayDoomDate) {
  const phase = todayDoomDate ? getVotePhase(todayDoomDate) : null

  // 투표 대상 날짜 = 오늘 doom 날짜 + 1일
  const voteTargetDate = todayDoomDate
    ? new Date(new Date(todayDoomDate).getTime() + 86400000).toISOString().slice(0, 10)
    : null

  const storageKey = voteTargetDate ? `edi-vote-${voteTargetDate}` : null

  const [myVote, setMyVote] = useState(() =>
    storageKey ? localStorage.getItem(storageKey) : null
  )
  const [showBallot, setShowBallot] = useState(false)
  const [voteData, setVoteData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${VOTE_BASE_URL}/today`)
      .then(res => res.ok ? res.json() : null)
      .then(json => setVoteData(json))
      .catch(() => setVoteData(null))
      .finally(() => setLoading(false))
  }, [])

  const castVote = async (direction) => {
    const prevVote = myVote
    // 재투표 시 이전 표 제거
    if (prevVote && prevVote !== direction) {
      await fetch(VOTE_BASE_URL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: prevVote, target_date: voteTargetDate }),
      })
    }
    const res = await fetch(VOTE_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction, target_date: voteTargetDate }),
    })
    if (res.ok) {
      const counts = await res.json()
      setVoteData(prev => prev ? { ...prev, ...counts } : counts)
      localStorage.setItem(storageKey, direction)
      setMyVote(direction)
      setShowBallot(false)
    } else if (prevVote && prevVote !== direction) {
      // POST 실패 시 삭제된 이전 표 복구
      await fetch(VOTE_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: prevVote, target_date: voteTargetDate }),
      })
    }
  }

  return { myVote, phase, showBallot, setShowBallot, castVote, voteData, loading }
}

const CARD_INFO = {
  society: { title: '🏙 SOCIETY', max: 30 },
  climate: { title: '🌡 CLIMATE', max: 30 },
  economy: { title: '📈 ECONOMY', max: 30 },
  solar:   { title: '☀ SOLAR STORM', max: 10 },
}

function DeltaBadge({ value }) {
  if (value === null || value === undefined) return null
  if (value > 0) return <span className="card-delta delta-up">+{value} ▲</span>
  if (value < 0) return <span className="card-delta delta-down">{value} ▽</span>
  return <span className="card-delta delta-zero">±0</span>
}

function VoteBar({ label, count, total, isMyVote }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className={`vote-bar-row${isMyVote ? ' vote-bar-mine' : ''}`}>
      <span className="vote-bar-label">{label}</span>
      <div className="vote-bar-track">
        <div className="vote-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="vote-bar-pct">{pct}%</span>
      {isMyVote && <span className="vote-bar-mark">◀</span>}
    </div>
  )
}

function YesterdayResult({ y, t }) {
  if (!y) return null
  const yTotal = y.up + y.flat + y.down
  const pct = (dir) => yTotal > 0 ? Math.round((y[dir] / yTotal) * 100) : 0
  return (
    <section className="nes-container is-dark with-title vote-section">
      <p className="title">📊 {t.resultTitle}</p>
      <div className="vote-result-body">
        <p className="vote-result-summary">
          {y.prediction === 'up' ? `▲ UP ${pct('up')}%` : y.prediction === 'flat' ? `— FLAT ${pct('flat')}%` : `▽ DOWN ${pct('down')}%`}
          {' → '}
          {y.actual === 'up' ? '▲ UP' : y.actual === 'flat' ? '— FLAT' : y.actual === 'down' ? '▽ DOWN' : '—'}
        </p>
        <p className={`vote-result-verdict nes-text ${y.correct ? 'is-success' : 'is-error'}`}>
          {y.correct === true ? `✓ ${t.correct}` : y.correct === false ? `✗ ${t.wrong}` : '—'}
        </p>
      </div>
    </section>
  )
}

function VoteSection({ todayDoomDate, lang }) {
  const t = translations[lang].vote
  const { myVote, phase, showBallot, setShowBallot, castVote, voteData, loading } = useVote(todayDoomDate)

  if (!phase || phase === 'pending' || loading) return null

  const counts = voteData ?? { up: 0, flat: 0, down: 0 }
  const total = (counts.up ?? 0) + (counts.flat ?? 0) + (counts.down ?? 0)
  const yesterday = voteData?.yesterday ?? null

  // 투표 마감 (phase=closed)
  if (phase === 'closed') {
    return (
      <>
        <YesterdayResult y={yesterday} t={t} />
        <section className="nes-container is-dark with-title vote-section">
          <p className="title">🎰 {t.title}</p>
          <div className="vote-closed-body">
            <VoteBar label="▲ UP"   count={counts.up}   total={total} isMyVote={myVote === 'up'} />
            <VoteBar label="— FLAT" count={counts.flat} total={total} isMyVote={myVote === 'flat'} />
            <VoteBar label="▽ DOWN" count={counts.down} total={total} isMyVote={myVote === 'down'} />
            <p className="vote-closed-msg nes-text is-warning">{t.closed}</p>
          </div>
        </section>
      </>
    )
  }

  // 투표 후 결과 뷰 (phase=open, myVote 있음, showBallot=false)
  if (myVote && !showBallot) {
    return (
      <>
        <YesterdayResult y={yesterday} t={t} />
        <section className="nes-container is-dark with-title vote-section">
          <p className="title">🎰 {t.title}</p>
          <div className="vote-result-body">
            <VoteBar label="▲ UP"   count={counts.up}   total={total} isMyVote={myVote === 'up'} />
            <VoteBar label="— FLAT" count={counts.flat} total={total} isMyVote={myVote === 'flat'} />
            <VoteBar label="▽ DOWN" count={counts.down} total={total} isMyVote={myVote === 'down'} />
            <p className="vote-total">{t.totalVoters(total)}</p>
            <button className="nes-btn is-warning vote-change-btn" onClick={() => setShowBallot(true)}>
              {t.changeVote}
            </button>
          </div>
        </section>
      </>
    )
  }

  // 투표 전 / 재투표 화면 (phase=open)
  return (
    <>
      <YesterdayResult y={yesterday} t={t} />
      <section className="nes-container is-dark with-title vote-section">
        <p className="title">🎰 {t.title}</p>
        <p className="vote-question">{t.question}</p>
        <div className="vote-buttons">
          <button
            className={`nes-btn ${myVote === 'up' ? 'is-primary' : ''} vote-btn`}
            onClick={() => castVote('up')}
          >▲ UP</button>
          <button
            className={`nes-btn ${myVote === 'flat' ? 'is-primary' : ''} vote-btn`}
            onClick={() => castVote('flat')}
          >— FLAT</button>
          <button
            className={`nes-btn ${myVote === 'down' ? 'is-primary' : ''} vote-btn`}
            onClick={() => castVote('down')}
          >▽ DOWN</button>
        </div>
      </section>
    </>
  )
}

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

function App() {
  const { data, loading, error } = useDoomData()
  const historyData = useDoomHistory()
  const { lang, toggle } = useLang()
  const t = translations[lang]

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
        <TopNav lang={lang} onToggle={toggle} />
        <div className="screen-center">
          <div className="nes-container is-dark">
            <p className="nes-text is-primary blink">{t.loadingTitle}</p>
            <p className="sub-text">{t.loading}</p>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <TopNav lang={lang} onToggle={toggle} />
        <div className="screen-center">
          <div className="nes-container is-dark is-rounded">
            <p className="nes-text is-error">{t.systemError}</p>
            <p className="sub-text">{error}</p>
          </div>
        </div>
      </>
    )
  }

  if (data?.message) {
    return (
      <>
        <TopNav lang={lang} onToggle={toggle} />
        <div className="screen-center">
          <div className="nes-container is-dark">
            <p className="nes-text is-warning">{t.noData}</p>
            <p className="sub-text">{t.noDataSub}</p>
          </div>
        </div>
      </>
    )
  }

  const totalColor = scoreColor(data.total_score ?? 0, 100)
  const { label: dangerLabel, cls: dangerCls } = dangerLevel(data.total_score ?? 0)
  const rawDate = new Date(data.target_date)
  const dateStr = isNaN(rawDate.getTime()) ? '-' : rawDate.toLocaleDateString(t.dateLocale)

  return (
    <>
    <TopNav lang={lang} onToggle={toggle} />
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
            <p className="commentary-text">
              {lang === 'ko'
                ? (data.ai_commentary ?? t.noCommentary)
                : (data.ai_commentary_en ?? t.noCommentary)}
            </p>
          </div>
        </div>
      </section>

      {/* 투표 섹션 */}
      <VoteSection todayDoomDate={data.target_date} lang={lang} />

      {/* 하단: 개별 지표 카드 4개 */}
      <section className="score-cards">
        <div
          className="nes-container is-dark with-title score-card"
          onClick={() => setSelectedCard('society')}
          style={{ cursor: 'pointer' }}
        >
          <p className="title">🏙society</p>
          <div className="card-right">
            <p className={`card-score nes-text ${scoreColor(data.society_score, 30)}`}>
              {data.society_score}
            </p>
            <p className="card-max">/ 30</p>
            <DeltaBadge value={delta(data.society_score, 'society_score')} />
          </div>
        </div>

        <div
          className="nes-container is-dark with-title score-card"
          onClick={() => setSelectedCard('climate')}
          style={{ cursor: 'pointer' }}
        >
          <p className="title">🌡climate</p>
          <div className="card-right">
            <p className={`card-score nes-text ${scoreColor(data.climate_score, 30)}`}>
              {data.climate_score}
            </p>
            <p className="card-max">/ 30</p>
            <DeltaBadge value={delta(data.climate_score, 'climate_score')} />
          </div>
        </div>

        <div
          className="nes-container is-dark with-title score-card"
          onClick={() => setSelectedCard('economy')}
          style={{ cursor: 'pointer' }}
        >
          <p className="title">📈economy</p>
          <div className="card-right">
            <p className={`card-score nes-text ${scoreColor(data.economy_score, 30)}`}>
              {data.economy_score}
            </p>
            <p className="card-max">/ 30</p>
            <DeltaBadge value={delta(data.economy_score, 'economy_score')} />
          </div>
        </div>

        <div
          className="nes-container is-dark with-title score-card"
          onClick={() => setSelectedCard('solar')}
          style={{ cursor: 'pointer' }}
        >
          <p className="title">☀SOLAR</p>
          <div className="card-right">
            <p className={`card-score nes-text ${scoreColor(data.solar_score, 10)}`}>
              {data.solar_score ?? 0}
            </p>
            <p className="card-max">/ 10</p>
            <DeltaBadge value={delta(data.solar_score, 'solar_score')} />
          </div>
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
          <button className="terms-btn" onClick={() => setShowTerms(true)}>{t.terms}</button>
          <span className="footer-sep">|</span>
          <a href="mailto:dev782108@gmail.com" className="footer-link">CONTACT</a>
        </div>
      </footer>

      {selectedCard && (
        <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="modal-box nes-container is-dark" onClick={e => e.stopPropagation()}>
            <p className="title">{CARD_INFO[selectedCard].title}</p>
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
          </div>
        </div>
      )}

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

    </div>
    </>
  )
}

export default App
