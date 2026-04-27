export default function TopNav({ lang, onToggle }) {
  return (
    <nav className="top-nav">
      <span className="nav-brand">
        EARTH DOOM INDEX
      </span>
      <button className="lang-toggle" onClick={onToggle}>
        <span className={lang === 'ko' ? 'nes-text is-primary' : ''}>KO</span>
        {' / '}
        <span className={lang === 'en' ? 'nes-text is-primary' : ''}>EN</span>
      </button>
    </nav>
  )
}
