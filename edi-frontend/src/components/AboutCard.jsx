/**
 * 허브 페이지(/{lang}/about)의 토픽 카드.
 *
 * 데스크탑: 카드 본문 + CTA 라인.
 * 모바일: CTA 라인 숨김, 우측 상단 chevron으로 클릭 가능 표시.
 */
export default function AboutCard({ lang, topic, label, description }) {
  return (
    <a href={`/${lang}/about/${topic}`} className="about-card nes-container is-dark with-title">
      <span className="about-card-chevron" aria-hidden="true">›</span>
      <p className="title">{label}</p>
      <p className="about-card-desc">{description}</p>
      <p className="about-card-cta">
        <span className="about-card-cta-text">
          {lang === 'ko' ? '자세히 알아보기' : 'Learn more'}
        </span>
        <span className="about-card-cta-arrow">→</span>
      </p>
    </a>
  )
}
