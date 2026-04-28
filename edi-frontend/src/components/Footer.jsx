import { Link } from 'react-router-dom'

export default function Footer({ lang, t, onShowTerms }) {
  return (
    <footer className="site-footer">
      <div className="footer-row">
        <a
          href="https://github.com/OLLAGANDA/earth-doom-index"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          GITHUB
        </a>
        <span className="footer-sep">|</span>
        <Link to={`/${lang}/about`} className="footer-link">
          {t.about.navLabel}
        </Link>
        <span className="footer-sep">|</span>
        <span>© 2026 EARTH DOOM INDEX</span>
        <span className="footer-sep">|</span>
        <button className="terms-btn" onClick={onShowTerms}>{t.terms}</button>
        <span className="footer-sep">|</span>
        <a href="mailto:dev782108@gmail.com" className="footer-link">CONTACT</a>
      </div>
    </footer>
  )
}
