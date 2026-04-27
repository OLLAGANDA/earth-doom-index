import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import App from '../App.jsx'

const VALID_LANGS = ['ko', 'en']

export default function Home({ lang }) {
  const navigate = useNavigate()
  const [currentLang, setCurrentLang] = useState(lang)

  useEffect(() => {
    if (VALID_LANGS.includes(lang)) {
      localStorage.setItem('edi-lang', lang)
      setCurrentLang(lang)
    }
  }, [lang])

  const onToggleLang = () => {
    const next = currentLang === 'ko' ? 'en' : 'ko'
    localStorage.setItem('edi-lang', next)
    navigate(`/${next}`)
  }

  return <App lang={currentLang} onToggleLang={onToggleLang} />
}
