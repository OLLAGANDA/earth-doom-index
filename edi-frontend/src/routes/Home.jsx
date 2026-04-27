import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import App from '../App.jsx'

export default function Home({ lang }) {
  const navigate = useNavigate()

  useEffect(() => {
    localStorage.setItem('edi-lang', lang)
  }, [lang])

  const onToggleLang = () => {
    const next = lang === 'ko' ? 'en' : 'ko'
    localStorage.setItem('edi-lang', next)
    navigate(`/${next}`)
  }

  return <App lang={lang} onToggleLang={onToggleLang} />
}
