/**
 * 허브 페이지(/{lang}/about)의 토픽 카드.
 *
 * 메인 페이지 점수 카드와 시각적 일관성을 위해 nes-container 사용.
 */
export default function AboutCard({ lang, topic, label, description }) {
  return (
    <a href={`/${lang}/about/${topic}`} className="about-card nes-container is-dark with-title">
      <p className="title">{label}</p>
      <p className="about-card-desc">{description}</p>
      <p className="about-card-cta">
        {lang === 'ko' ? '자세히 알아보기 →' : 'Learn more →'}
      </p>
    </a>
  )
}
