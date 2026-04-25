/* global process */
import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

const REACT_ELEMENT = Symbol.for('react.element')

function el(type, props, ...children) {
  const flat = children.flat().filter(c => c !== null && c !== undefined && c !== false)
  return {
    $$typeof: REACT_ELEMENT,
    type,
    key: null,
    ref: null,
    props: { ...(props || {}), children: flat.length === 1 ? flat[0] : flat },
  }
}

const SCORE_COLORS = {
  doom:     '#e63946',
  critical: '#e63946',
  danger:   '#f0a844',
  caution:  '#e9c46a',
  notice:   '#b8d941',
  safe:     '#57cc99',
}

function getDangerInfo(score) {
  if (score >= 86) return { label: 'DOOM',             color: SCORE_COLORS.doom }
  if (score >= 71) return { label: 'BEYOND RECOVERY',  color: SCORE_COLORS.critical }
  if (score >= 51) return { label: 'NEAR CRITICAL',    color: SCORE_COLORS.danger }
  if (score >= 31) return { label: 'ACCELERATING',     color: SCORE_COLORS.caution }
  if (score >= 16) return { label: 'ANOMALY DETECTED', color: SCORE_COLORS.notice }
  return               { label: 'PEACEFUL ILLUSION', color: SCORE_COLORS.safe }
}

export default async function handler() {
  const API_BASE = process.env.VITE_API_URL ?? ''

  let score = null
  let dangerInfo = { label: 'DATA UNAVAILABLE', color: '#aaaaaa' }
  let commentary = ''
  let dateStr = ''

  try {
    const res = await fetch(`${API_BASE}/api/today-doom`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const data = await res.json()
      score = data.total_score
      dangerInfo = getDangerInfo(score)
      const raw = data.ai_commentary_en ?? ''
      commentary = raw.length > 80 ? raw.slice(0, 80) + '...' : raw
      const d = data.target_date ? new Date(data.target_date) : null
      if (d && !isNaN(d.getTime())) {
        dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
      }
    }
  } catch {
    // 폴백: 점수 없이 렌더
  }

  const fonts = []

  const tree = el('div', {
    style: {
      width: '1200px', height: '630px', background: '#212529',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace',
      color: '#ffffff', padding: '60px',
    },
  },
    el('div', { style: { fontSize: '18px', color: '#888888', marginBottom: '12px', display: 'flex' } }, 'EARTH DOOM INDEX'),
    el('div', { style: { fontSize: '128px', color: dangerInfo.color, marginBottom: '24px', display: 'flex' } }, score !== null ? String(score) : '—'),
    el('div', { style: { fontSize: '22px', color: dangerInfo.color, display: 'flex' } }, dangerInfo.label)
  )

  const imageResponse = new ImageResponse(tree, { width: 1200, height: 630, fonts })
  imageResponse.headers.set('Cache-Control', 's-maxage=86400, stale-while-revalidate')
  return imageResponse
}
