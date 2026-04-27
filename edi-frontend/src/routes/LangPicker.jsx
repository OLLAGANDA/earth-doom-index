import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function detectLang() {
  if (typeof window === 'undefined') return 'en'
  const saved = localStorage.getItem('edi-lang')
  if (saved === 'ko' || saved === 'en') return saved
  return navigator.language?.startsWith('ko') ? 'ko' : 'en'
}

export default function LangPicker() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(`/${detectLang()}`, { replace: true })
  }, [navigate])

  // 정적 prerender 시 봇이 보는 본문: 양 언어 링크 (검색 발견용)
  return (
    <div className="lang-picker">
      <h1>Earth Doom Index</h1>
      <p>Choose your language / 언어를 선택하세요</p>
      <ul>
        <li><a href="/ko">한국어</a></li>
        <li><a href="/en">English</a></li>
      </ul>
    </div>
  )
}
