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
    // 폴백: 점수 없이 렌더
  }

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
    el('div', { style: { display: 'flex', fontSize: '24px', color: '#888888', marginBottom: '20px' } }, 'EARTH DOOM INDEX'),
    el('div', { style: { display: 'flex', fontSize: '160px', color: '#ffffff' } }, score !== null ? String(score) : '—')
  )

  return new ImageResponse(tree, { width: 1200, height: 630 })
}
