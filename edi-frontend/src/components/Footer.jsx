import { Link } from 'react-router-dom'

const FOOTER_TOPIC_KEYS = ['society', 'climate', 'economy', 'solar', 'methodology']

export default function Footer({ lang, t, onShowTerms }) {
  const topicLabels = t.about.topicLabels
  const topicsLabel = t.footer?.topicsLabel ?? 'Topics:'
  return (
    <footer className="site-footer">
      <div className="footer-row footer-topics">
        <span className="footer-topics-label">{topicsLabel}</span>
        {FOOTER_TOPIC_KEYS.map(key => (
          <Link key={key} to={`/${lang}/about/${key}`} className="footer-link footer-topic-link">
            {topicLabels[key]}
          </Link>
        ))}
      </div>
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
