/* global process */
import { ImageResponse } from '@vercel/og'
import React from 'react'

export const config = { runtime: 'edge' }

const el = React.createElement

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

async function loadPressStart2PFont() {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' },
        signal: AbortSignal.timeout(3000),
      }
    ).then(r => r.text())
    const fontUrl = css.match(/url\((https:\/\/.+?\.woff2)\)/)?.[1]
    if (!fontUrl) return null
    return fetch(fontUrl, { signal: AbortSignal.timeout(3000) }).then(r => r.arrayBuffer())
  } catch {
    return null
  }
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

  const fontData = await loadPressStart2PFont().catch(() => null)
  const fonts = fontData
    ? [{ name: 'Press Start 2P', data: fontData, style: 'normal', weight: 400 }]
    : []

  const tree = el('div', {
    style: {
      width: '1200px', height: '630px', background: '#212529',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: fonts.length ? '"Press Start 2P"' : 'monospace',
      color: '#ffffff', padding: '60px', position: 'relative',
    },
  },
    el('div', { style: { fontSize: '18px', color: '#888888', marginBottom: '12px', letterSpacing: '3px', display: 'flex' } }, 'EARTH DOOM INDEX'),
    dateStr
      ? el('div', { style: { fontSize: '12px', color: '#555555', marginBottom: '36px', display: 'flex' } }, dateStr)
      : null,
    score !== null
      ? el('div', { style: { display: 'flex', alignItems: 'baseline', marginBottom: '24px' } },
          el('span', { style: { fontSize: '128px', color: dangerInfo.color, lineHeight: 1 } }, String(score)),
          el('span', { style: { fontSize: '36px', color: '#555555', marginLeft: '12px' } }, '/ 100')
        )
      : el('div', { style: { fontSize: '48px', color: '#555555', marginBottom: '24px', display: 'flex' } }, '— / 100'),
    el('div', {
      style: {
        fontSize: '22px', color: dangerInfo.color,
        border: `3px solid ${dangerInfo.color}`,
        padding: '10px 24px', marginBottom: '36px', letterSpacing: '2px', display: 'flex',
      },
    }, dangerInfo.label),
    commentary
      ? el('div', {
          style: {
            fontSize: '13px', color: '#aaaaaa', maxWidth: '900px',
            textAlign: 'center', lineHeight: '1.8',
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          },
        }, `"${commentary}"`)
      : null,
    el('div', {
      style: {
        position: 'absolute', bottom: '28px', right: '40px',
        fontSize: '11px', color: '#444444', display: 'flex',
      },
    }, 'earthdoomindex.com')
  )

  const imageResponse = new ImageResponse(tree, { width: 1200, height: 630, fonts })
  imageResponse.headers.set('Cache-Control', 's-maxage=86400, stale-while-revalidate')
  return imageResponse
}
