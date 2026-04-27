import { Link } from 'react-router-dom'

const TOPICS = ['society', 'climate', 'economy', 'solar', 'methodology']

export default function Footer({ lang, t, onShowTerms }) {
  const a = t.about

  return (
    <footer className="site-footer">
      <div className="footer-row footer-about">
        {TOPICS.map(topic => (
          <span key={topic}>
            <Link to={`/${lang}/about/${topic}`} className="footer-link">
              {a.topicLabels[topic].replace(/^\S+\s/, '')}
            </Link>
            <span className="footer-sep">|</span>
          </span>
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
        <span>© 2026 EARTH DOOM INDEX</span>
        <span className="footer-sep">|</span>
        <button className="terms-btn" onClick={onShowTerms}>{t.terms}</button>
        <span className="footer-sep">|</span>
        <a href="mailto:dev782108@gmail.com" className="footer-link">CONTACT</a>
      </div>
    </footer>
  )
}
