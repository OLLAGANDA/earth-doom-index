import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

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

export default function DoomChart({ historyData: allHistory = [], t = {} }) {
  const [days, setDays] = useState(7)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const historyData = allHistory.slice(-days)

  const scores = historyData.map(d => d.total_score).filter(v => v != null)
  const chartMax = scores.length ? Math.max(...scores) : null
  const chartMin = scores.length ? Math.min(...scores) : null

  return (
    <section className="nes-container is-dark with-title chart-section">
      <p className="title">{t.title}</p>

      <div className="chart-toggle-row">
        <button
          className={`nes-btn ${days === 7 ? 'is-error' : ''}`}
          onClick={() => setDays(7)}
        >
          7D
        </button>
        <button
          className={`nes-btn ${days === 30 ? 'is-error' : ''}`}
          onClick={() => setDays(30)}
        >
          30D
        </button>
        <button
          className={`nes-btn ${showBreakdown ? 'is-warning' : ''}`}
          onClick={() => setShowBreakdown(v => !v)}
        >
          {t.breakdown}
        </button>
      </div>

      {historyData.length === 0 && (
        <div className="nes-container is-dark">
          <p className="nes-text is-warning" style={{ fontSize: '10px' }}>{t.noHistory}</p>
          <p className="sub-text">아직 기록된 데이터가 없습니다.</p>
        </div>
      )}

      {historyData.length > 0 && (
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={historyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#444" />
            <XAxis
              dataKey="target_date"
              tickFormatter={formatDate}
              fontSize={8}
              stroke="#666"
              tick={{ fill: '#aaa' }}
            />
            <YAxis
              domain={[0, 100]}
              fontSize={8}
              stroke="#666"
              tick={{ fill: '#aaa' }}
            />
            <Tooltip content={<RetroTooltip />} />
            {showBreakdown && <Legend wrapperStyle={{ fontSize: '8px' }} />}
            <Line
              type="linear"
              dataKey="total_score"
              name={t.total}
              stroke="#e76e55"
              strokeWidth={3}
              dot={false}
            />
            {chartMax !== null && (
              <ReferenceLine
                y={chartMax}
                stroke="#e76e55"
                strokeDasharray="4 4"
                label={{ value: t.high, fill: '#e76e55', fontSize: 8, position: 'insideBottomRight' }}
              />
            )}
            {chartMin !== null && chartMin !== chartMax && (
              <ReferenceLine
                y={chartMin}
                stroke="#92cc41"
                strokeDasharray="4 4"
                label={{ value: t.low, fill: '#92cc41', fontSize: 8, position: 'insideTopRight' }}
              />
            )}
            {showBreakdown && (
              <Line
                type="linear"
                dataKey="society_score"
                name={t.society}
                stroke="#92cc41"
                strokeWidth={1.5}
                dot={false}
              />
            )}
            {showBreakdown && (
              <Line
                type="linear"
                dataKey="climate_score"
                name={t.climate}
                stroke="#209cee"
                strokeWidth={1.5}
                dot={false}
              />
            )}
            {showBreakdown && (
              <Line
                type="linear"
                dataKey="economy_score"
                name={t.economy}
                stroke="#f7d51d"
                strokeWidth={1.5}
                dot={false}
              />
            )}
            {showBreakdown && (
              <Line
                type="linear"
                dataKey="solar_score"
                name={t.solar}
                stroke="#ff6b6b"
                strokeWidth={1.5}
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      )}

    </section>
  )
}
