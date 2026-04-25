/* global process */
import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

const REACT_ELEMENT = Symbol.for('react.element')

function el(type, props, ...children) {
  return {
    $$typeof: REACT_ELEMENT,
    type,
    key: null,
    ref: null,
    props: { ...(props || {}), children: children.length === 1 ? children[0] : children },
  }
}

function getDangerInfo(score) {
  if (score === null) return { label: 'DATA UNAVAILABLE', color: '#aaaaaa' }
  if (score >= 86) return { label: 'DOOM',             color: '#e63946' }
  if (score >= 71) return { label: 'BEYOND RECOVERY',  color: '#e63946' }
  if (score >= 51) return { label: 'NEAR CRITICAL',    color: '#f0a844' }
  if (score >= 31) return { label: 'ACCELERATING',     color: '#e9c46a' }
  if (score >= 16) return { label: 'ANOMALY DETECTED', color: '#b8d941' }
  return               { label: 'PEACEFUL ILLUSION', color: '#57cc99' }
}

export default async function handler() {
  const API_BASE = process.env.VITE_API_URL ?? ''

  let score = null
  try {
    const res = await fetch(`${API_BASE}/api/today-doom`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const data = await res.json()
      score = data.total_score
    }
  } catch {
    // 폴백
  }

  const danger = getDangerInfo(score)

  const tree = el('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#212529',
      color: '#ffffff',
    },
  },
    el('div', { style: { display: 'flex', fontSize: '24px', color: '#888888', marginBottom: '20px', letterSpacing: '4px' } }, 'EARTH DOOM INDEX'),
    el('div', { style: { display: 'flex', fontSize: '160px', color: danger.color, marginBottom: '20px' } }, score !== null ? String(score) : '—'),
    el('div', {
      style: {
        display: 'flex',
        fontSize: '28px',
        color: danger.color,
        padding: '12px 28px',
        border: `3px solid ${danger.color}`,
        letterSpacing: '3px',
      },
    }, danger.label)
  )

  return new ImageResponse(tree, { width: 1200, height: 630 })
}
