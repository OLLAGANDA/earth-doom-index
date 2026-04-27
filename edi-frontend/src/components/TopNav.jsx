import { Link } from 'react-router-dom'
import { useState } from 'react'
import { translations } from '../i18n.js'

const TOPICS = ['society', 'climate', 'economy', 'solar']

export default function TopNav({ lang, onToggle }) {
  const [open, setOpen] = useState(false)
  const t = translations[lang]
  const a = t.about

  return (
    <nav className="top-nav">
      <Link to={`/${lang}`} className="nav-brand">
        EARTH DOOM INDEX
      </Link>

      <div className="nav-menu">
        <div
          className="nav-dropdown-wrap"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <button
            className="nav-link"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
          >
            {a.navLabel} ▾
          </button>
          {open && (
            <ul className="nav-dropdown">
              <li>
                <Link to={`/${lang}/about`} onClick={() => setOpen(false)}>
                  {a.indexTitle}
                </Link>
              </li>
              {TOPICS.map(topic => (
                <li key={topic}>
                  <Link to={`/${lang}/about/${topic}`} onClick={() => setOpen(false)}>
                    {a.topicLabels[topic]}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link to={`/${lang}/about/methodology`} className="nav-link">
          {a.navMethodology}
        </Link>
      </div>

      <button className="lang-toggle" onClick={onToggle}>
        <span className={lang === 'ko' ? 'nes-text is-primary' : ''}>KO</span>
        {' / '}
        <span className={lang === 'en' ? 'nes-text is-primary' : ''}>EN</span>
      </button>
    </nav>
  )
}
