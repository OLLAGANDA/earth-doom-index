import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import TopNav from '../components/TopNav.jsx'
import Footer from '../components/Footer.jsx'
import { translations } from '../i18n.js'

const VALID_LANGS = ['ko', 'en']

export default function AboutLayout() {
  const { lang: paramLang } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [showTerms, setShowTerms] = useState(false)

  const lang = VALID_LANGS.includes(paramLang) ? paramLang : 'ko'
  const t = translations[lang]

  useEffect(() => {
    localStorage.setItem('edi-lang', lang)
  }, [lang])

  const onToggleLang = () => {
    const next = lang === 'ko' ? 'en' : 'ko'
    localStorage.setItem('edi-lang', next)
    // 현재 경로에서 /ko/... 를 /en/... 로 (또는 반대) 치환
    const newPath = location.pathname.replace(`/${lang}/`, `/${next}/`)
    navigate(newPath)
  }

  return (
    <>
      <TopNav lang={lang} onToggle={onToggleLang} />
      <div className="about-screen">
        <Outlet context={{ lang, t }} />
      </div>
      <Footer t={t} onShowTerms={() => setShowTerms(true)} />
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
    </>
  )
}
