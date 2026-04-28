import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

const COLORS = {
  society: '#92cc41',
  climate: '#209cee',
  economy: '#f7d51d',
  solar:   '#ff6b6b',
}

const SOURCES = {
  society: 'GDELT Project',
  climate: 'OpenWeather API',
  economy: 'Yahoo Finance',
  solar:   'NOAA SWPC',
}

const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

const RetroTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{
      background: '#1a1a1a',
      border: '2px solid #555',
      padding: '8px 12px',
      fontSize: '9px',
      lineHeight: '2',
    }}>
      <p style={{ color: '#ddd', marginBottom: 4 }}>{formatDate(label)}</p>
      {payload.map(entry => (
        <p key={entry.dataKey} style={{ color: entry.color, margin: 0 }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

/**
 * 토픽별 30일 추세 차트.
 * 클라이언트 mount 후 /api/doom-history fetch → 단일 지표 라인 렌더.
 * SSG 시점엔 loading placeholder만 박힘 (의도).
 */
export default function TopicChart({ kind, days = 30 }) {
  const [state, setState] = useState({ status: 'loading', data: [], error: null })
  const [retryNonce, setRetryNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', data: [], error: null })
    const apiBase = import.meta.env.VITE_API_URL ?? ''
    fetch(`${apiBase}/api/doom-history?days=${days}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(rows => {
        if (cancelled) return
        setState({ status: 'ready', data: rows, error: null })
      })
      .catch(err => {
        if (cancelled) return
        setState({ status: 'error', data: [], error: err.message })
      })
    return () => { cancelled = true }
  }, [days, retryNonce])

  const color = COLORS[kind] ?? '#aaa'
  const dataKey = `${kind}_score`
  const scores = state.data.map(d => d[dataKey]).filter(v => v != null)
  const chartMax = scores.length ? Math.max(...scores) : null
  const chartMin = scores.length ? Math.min(...scores) : null

  return (
    <section className="topic-chart-section nes-container is-dark">
      {state.status === 'loading' && (
        <div className="topic-chart-loading">
          <p>차트 데이터 불러오는 중...</p>
        </div>
      )}
      {state.status === 'error' && (
        <div className="topic-chart-error">
          <p>차트를 불러올 수 없습니다.</p>
          <button
            className="nes-btn"
            onClick={() => setRetryNonce(n => n + 1)}
          >
            다시 시도
          </button>
        </div>
      )}
      {state.status === 'ready' && state.data.length > 0 && (
        <>
          <div className="topic-chart-wrapper">
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={state.data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#444" />
                <XAxis
                  dataKey="target_date"
                  tickFormatter={formatDate}
                  fontSize={8}
                  stroke="#666"
                  tick={{ fill: '#aaa' }}
                />
                <YAxis
                  fontSize={8}
                  stroke="#666"
                  tick={{ fill: '#aaa' }}
                />
                <Tooltip content={<RetroTooltip />} />
                <Line
                  type="linear"
                  dataKey={dataKey}
                  name={kind}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                />
                {chartMax !== null && (
                  <ReferenceLine
                    y={chartMax}
                    stroke={color}
                    strokeDasharray="4 4"
                    label={{ value: '최고', fill: color, fontSize: 8, position: 'insideBottomRight' }}
                  />
                )}
                {chartMin !== null && chartMin !== chartMax && (
                  <ReferenceLine
                    y={chartMin}
                    stroke="#888"
                    strokeDasharray="4 4"
                    label={{ value: '최저', fill: '#888', fontSize: 8, position: 'insideTopRight' }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="topic-chart-caption">출처: {SOURCES[kind] ?? '—'} | 최근 {days}일</p>
        </>
      )}
    </section>
  )
}
