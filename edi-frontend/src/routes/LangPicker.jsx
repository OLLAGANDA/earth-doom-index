import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHead from '../seo/PageHead.jsx'

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

  // 정적 prerender 시 봇이 보는 본문: 양 언어 링크 (검색 발견용).
  // 이 페이지의 canonical은 영어 홈(/en)을 가리키고 noindex 처리한다 —
  // / 자체는 클라이언트 리디렉션 페이지이므로 GSC가 "리디렉션이 포함된 페이지"로
  // 분류해도 색인 후보에서 빠지도록.
  return (
    <>
      <PageHead
        lang="en"
        title="Earth Doom Index — How Close Is Earth to Doom Today?"
        description="Daily Earth Doom Index — a 0–100 score combining society, climate, economy, and solar threat signals."
        path="/en"
        koPath="/ko"
        enPath="/en"
        noindex
      />
      <div className="lang-picker">
        <h1>Earth Doom Index</h1>
        <p>Choose your language / 언어를 선택하세요</p>
        <ul>
          <li><a href="/ko">한국어</a></li>
          <li><a href="/en">English</a></li>
        </ul>
      </div>
    </>
  )
}
