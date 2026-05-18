import { useState, useEffect, useRef } from 'react'
import './App.css'
import DoomChart from './DoomChart.jsx'
import TopNav from './components/TopNav.jsx'
import Footer from './components/Footer.jsx'
import PageHead from './seo/PageHead.jsx'
import { organizationJsonLd, websiteJsonLd } from './seo/jsonLd.js'
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

function dangerLevel(score, t) {
  if (score >= 86) return { label: t.dangerLevel.doom,     cls: 'is-error blink' }  // 빨강 깜빡
  if (score >= 71) return { label: t.dangerLevel.critical, cls: 'is-error' }        // 빨강
  if (score >= 51) return { label: t.dangerLevel.danger,   cls: 'doom-orange' }     // 주황
  if (score >= 31) return { label: t.dangerLevel.caution,  cls: 'is-warning' }      // 노랑
  if (score >= 16) return { label: t.dangerLevel.notice,   cls: 'doom-lime' }       // 연두
  return                   { label: t.dangerLevel.safe,    cls: 'is-success' }      // 초록
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
  const [isVoting, setIsVoting] = useState(false)
  const votingRef = useRef(false)

  useEffect(() => {
    fetch(`${VOTE_BASE_URL}/today`)
      .then(res => res.ok ? res.json() : null)
      .then(json => setVoteData(json))
      .catch(() => setVoteData(null))
      .finally(() => setLoading(false))
  }, [])

  const castVote = async (direction) => {
    if (votingRef.current) return
    // 재투표 화면에서 기존과 같은 방향 클릭 시 API 호출 없이 닫기
    if (myVote === direction) {
      setShowBallot(false)
      return
    }
    votingRef.current = true
    setIsVoting(true)
    const prevVote = myVote
    try {
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
    } finally {
      votingRef.current = false
      setIsVoting(false)
    }
  }

  return { myVote, phase, showBallot, setShowBallot, castVote, voteData, loading, isVoting }
}

function computeVoteCountdown(todayDoomDate) {
  if (!todayDoomDate) return { label: null, time: null, urgent: false }
  const now = new Date()
  const todayUTC = now.toISOString().slice(0, 10)
  const dateStr = todayDoomDate.slice(0, 10)

  if (dateStr < todayUTC) return { label: null, time: null, urgent: false }

  const phase = getVotePhase(dateStr)
  if (phase === 'closed') return { label: null, time: null, urgent: false }

  const target = phase === 'pending'
    ? new Date(`${dateStr}T00:05:00Z`)
    : new Date(`${dateStr}T23:59:00Z`)
  const label = phase === 'pending' ? 'OPENS IN' : 'VOTE CLOSES IN'

  const secsLeft = Math.floor((target - now) / 1000)
  if (secsLeft <= 0) return { label: null, time: null, urgent: false }

  const h = String(Math.floor(secsLeft / 3600)).padStart(2, '0')
  const m = String(Math.floor((secsLeft % 3600) / 60)).padStart(2, '0')
  const s = String(secsLeft % 60).padStart(2, '0')

  return { label, time: `${h}:${m}:${s}`, urgent: phase === 'open' && secsLeft < 3600 }
}

function useVoteCountdown(todayDoomDate) {
  const [countdown, setCountdown] = useState(() => computeVoteCountdown(todayDoomDate))

  useEffect(() => {
    if (!todayDoomDate) return
    const id = setInterval(() => setCountdown(computeVoteCountdown(todayDoomDate)), 1000)
    return () => clearInterval(id)
  }, [todayDoomDate])

  return countdown
}

const CARD_INFO = {
  society: { max: 30 },
  climate: { max: 30 },
  economy: { max: 30 },
  solar:   { max: 10 },
}

function DeltaBadge({ value }) {
  if (value === null || value === undefined) return null
  if (value > 0) return <span className="card-delta delta-up">+{value} ▲</span>
  if (value < 0) return <span className="card-delta delta-down">{value} ▽</span>
  return <span className="card-delta delta-zero">±0</span>
}

function VoteBar({ label, count, total, isMyVote, isMajority }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className={`vote-bar-row${isMyVote ? ' vote-bar-mine' : ''}${isMajority ? ' vote-bar-majority' : ''}`}>
      <span className="vote-bar-label">{label}</span>
      <div className="vote-bar-track">
        <div className="vote-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="vote-bar-pct">{pct}%</span>
      {isMyVote && <span className="vote-bar-mark">◀</span>}
      {isMajority && <span className="vote-bar-mark vote-bar-majority-mark">★</span>}
    </div>
  )
}

function VoteTimerChip({ label, time, urgent }) {
  if (!label) return null
  return (
    <div className={`vote-timer-chip${urgent ? ' warn' : ''}`}>
      <span className="vote-timer-label">{label}</span>
      <span className="vote-timer-time">{time}</span>
    </div>
  )
}

function YesterdayResult({ y, t }) {
  if (!y) return null
  const yTotal = y.up + y.flat + y.down
  const actualLabel = y.actual === 'up' ? '▲ UP' : y.actual === 'flat' ? '— FLAT' : '▽ DOWN'
  return (
    <section className="nes-container is-dark with-title vote-section">
      <p className="title">📊 {t.resultTitle}</p>
      <div className="vote-result-body">
        <p className="vote-result-label">{t.resultVoted}</p>
        <VoteBar label="▲ UP"   count={y.up}   total={yTotal} isMajority={y.prediction === 'up'} />
        <VoteBar label="— FLAT" count={y.flat} total={yTotal} isMajority={y.prediction === 'flat'} />
        <VoteBar label="▽ DOWN" count={y.down} total={yTotal} isMajority={y.prediction === 'down'} />
        <p className="vote-result-label">{t.resultActual}</p>
        <p className={`vote-result-actual nes-text ${y.correct ? 'is-success' : 'is-error'}`}>{actualLabel}</p>
        <p className={`vote-result-verdict nes-text ${y.correct ? 'is-success' : 'is-error'}`}>
          {y.correct === true ? `✓ ${t.correct}` : y.correct === false ? `✗ ${t.wrong}` : '—'}
        </p>
      </div>
    </section>
  )
}

function VoteSection({ todayDoomDate, lang }) {
  const t = translations[lang].vote
  const { myVote, phase, showBallot, setShowBallot, castVote, voteData, loading, isVoting } = useVote(todayDoomDate)
  const countdown = useVoteCountdown(todayDoomDate)

  if (!phase || (phase === 'pending' && countdown.label === null) || loading) return null

  // 투표 오픈 대기 (오늘 pending, UTC 00:00~00:04)
  if (phase === 'pending') {
    return (
      <section className="nes-container is-dark with-title vote-section">
        <p className="title">🎰 {t.title}</p>
        <div className="vote-question-row">
          <p className="vote-question">{t.question}</p>
          <VoteTimerChip {...countdown} />
        </div>
      </section>
    )
  }

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
        <div className="vote-question-row">
          <p className="vote-question">{t.question}</p>
          <VoteTimerChip {...countdown} />
        </div>
        <div className="vote-buttons">
          <button
            className={`nes-btn ${myVote === 'up' ? 'is-primary' : ''} vote-btn`}
            onClick={() => castVote('up')}
            disabled={isVoting}
          >▲ UP</button>
          <button
            className={`nes-btn ${myVote === 'flat' ? 'is-primary' : ''} vote-btn`}
            onClick={() => castVote('flat')}
            disabled={isVoting}
          >— FLAT</button>
          <button
            className={`nes-btn ${myVote === 'down' ? 'is-primary' : ''} vote-btn`}
            onClick={() => castVote('down')}
            disabled={isVoting}
          >▽ DOWN</button>
        </div>
      </section>
    </>
  )
}

function ShareButtons({ score, dangerLabel, lang }) {
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef(null)
  const t = translations[lang].share
  const shareUrl = 'https://www.earthdoomindex.com'
  const shareText = lang === 'ko'
    ? `오늘 지구 멸망 지수: ${score}점 — ${dangerLabel}`
    : `Today's Earth Doom Index: ${score}/100 — ${dangerLabel}`

  const flashCopied = () => {
    setCopied(true)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      flashCopied()
    } catch {
      try {
        const el = document.createElement('textarea')
        el.value = shareUrl
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
        flashCopied()
      } catch {
        // 두 방법 모두 실패 시 조용히 무시 (보안 컨텍스트 외)
      }
    }
  }

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: shareText, url: shareUrl })
        return
      } catch (err) {
        if (err && err.name === 'AbortError') return
      }
    }
    await copyToClipboard()
  }

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
  }, [])

  return (
    <div className="share-buttons">
      <button className="nes-btn is-primary share-btn" onClick={handleShare}>
        {copied ? t.copied : t.button}
      </button>
    </div>
  )
}

function HomePageHead({ lang }) {
  return (
    <PageHead
      lang={lang}
      title={lang === 'ko'
        ? 'Earth Doom Index — 오늘 지구는 얼마나 망했나?'
        : 'Earth Doom Index — How Close Is Earth to Doom Today?'}
      description={lang === 'ko'
        ? 'DOOM-9000이 매일 계산하는 지구 멸망 지수. 사회·기후·경제·태양 4개 영역 위협을 종합한 0~100점.'
        : 'Daily Earth Doom Index calculated by DOOM-9000. A 0–100 score combining society, climate, economy, and solar threat signals.'}
      path={`/${lang}`}
      koPath="/ko"
      enPath="/en"
      jsonLd={[organizationJsonLd(), websiteJsonLd(lang)]}
    />
  )
}

// 데이터 fetch 여부와 무관하게 prerender HTML과 hydrated DOM에 항상 들어가는 정적 본문.
// SSG 시점에 봇이 보는 페이지 품질 신호로 사용된다. 게임 UI 톤을 해치지 않도록
// h1 + 짧은 lead 한 문단 + about 링크만 두고, 영역별 상세는 about 페이지로 위임.
function HomeIntro({ lang, t }) {
  const intro = t.home.intro
  const lead = intro.lead.split('\n\n')[0]
  const topicLabels = t.about.topicLabels
  return (
    <section className="home-intro">
      <h1 className="home-intro-title">{intro.title}</h1>
      <p className="home-intro-lead">{lead}</p>
      <nav className="home-intro-topics" aria-label={intro.topicsLabel}>
        <a href={`/${lang}/about/society`}>{topicLabels.society}</a>
        <a href={`/${lang}/about/climate`}>{topicLabels.climate}</a>
        <a href={`/${lang}/about/economy`}>{topicLabels.economy}</a>
        <a href={`/${lang}/about/solar`}>{topicLabels.solar}</a>
      </nav>
      <p className="home-intro-more">
        <a href={`/${lang}/about`}>{intro.aboutLink}</a>
      </p>
    </section>
  )
}

function App({ lang, onToggleLang }) {
  const { data, loading, error } = useDoomData()
  const historyData = useDoomHistory()
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
        <HomePageHead lang={lang} />
        <TopNav lang={lang} onToggle={onToggleLang} />
        <div className="game-screen">
          <HomeIntro lang={lang} t={t} />
          <div className="screen-center">
            <div className="nes-container is-dark">
              <p className="nes-text is-primary blink">{t.loadingTitle}</p>
              <p className="sub-text">{t.loading}</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <HomePageHead lang={lang} />
        <TopNav lang={lang} onToggle={onToggleLang} />
        <div className="game-screen">
          <HomeIntro lang={lang} t={t} />
          <div className="screen-center">
            <div className="nes-container is-dark is-rounded">
              <p className="nes-text is-error">{t.systemError}</p>
              <p className="sub-text">{error}</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (data?.message) {
    return (
      <>
        <HomePageHead lang={lang} />
        <TopNav lang={lang} onToggle={onToggleLang} />
        <div className="game-screen">
          <HomeIntro lang={lang} t={t} />
          <div className="screen-center">
            <div className="nes-container is-dark">
              <p className="nes-text is-warning">{t.noData}</p>
              <p className="sub-text">{t.noDataSub}</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  const { label: dangerLabel, cls: dangerCls } = dangerLevel(data.total_score ?? 0, t)
  const rawDate = new Date(data.target_date)
  const dateStr = isNaN(rawDate.getTime()) ? '-' : rawDate.toLocaleDateString(t.dateLocale)

  return (
    <>
    <HomePageHead lang={lang} />
    <TopNav lang={lang} onToggle={onToggleLang} />
    <div className="game-screen">

      {/* 상단: 타이틀 + 총점 */}
      <section className="nes-container is-dark with-title title-section">
        <p className="game-subtitle">EARTH DOOM INDEX</p>
        <p className="game-tagline">{t.tagline}</p>
        <p className={`total-score nes-text ${dangerCls}`}>
          {data.total_score}
          <span className="score-max"> / 100</span>
        </p>
        <p className={`danger-badge nes-text ${dangerCls}`}>{dangerLabel}</p>
        <p className="game-date">{dateStr}</p>
        <ShareButtons score={data.total_score ?? 0} dangerLabel={dangerLabel} lang={lang} />
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
          <p className="title">{t.cards.society.title}</p>
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
          <p className="title">{t.cards.climate.title}</p>
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
          <p className="title">{t.cards.economy.title}</p>
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
          <p className="title">{t.cards.solar.title}</p>
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
      <DoomChart historyData={historyData} t={t.chart} />

      {/* 사이트 소개 — SEO 본문 콘텐츠 (Googlebot이 렌더 후 DOM에서도 보도록) */}
      <HomeIntro lang={lang} t={t} />

      {/* 푸터 */}
      <Footer lang={lang} t={t} onShowTerms={() => setShowTerms(true)} />

      {selectedCard && (
        <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="modal-box nes-container is-dark" onClick={e => e.stopPropagation()}>
            <p className="title">{t.cards[selectedCard].title}</p>
            <div className="modal-content">
              <p>{t.cards[selectedCard].desc}</p>
              <p className="card-info-source">
                {t.cardInfoSource(t.cards[selectedCard].source, CARD_INFO[selectedCard].max)}
              </p>
            </div>
            <div className="modal-actions">
              <a
                href={`/${lang}/about/${selectedCard}`}
                className="nes-btn is-primary"
              >
                {t.about.learnMore}
              </a>
              <button
                className="nes-btn is-error modal-close"
                onClick={() => setSelectedCard(null)}
              >
                {t.termsClose}
              </button>
            </div>
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
