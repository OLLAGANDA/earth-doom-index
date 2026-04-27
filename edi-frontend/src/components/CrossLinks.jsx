const TOPIC_LABELS = {
  ko: {
    society: '🏙 사회 위협 지수',
    climate: '🌡 기후 위협 지수',
    economy: '📈 경제 위협 지수',
    solar: '☀ 태양 위협 지수',
    methodology: '📐 종합 산정 방법론',
  },
  en: {
    society: '🏙 Society Threat Index',
    climate: '🌡 Climate Threat Index',
    economy: '📈 Economy Threat Index',
    solar: '☀ Solar Threat Index',
    methodology: '📐 Methodology',
  },
}

const ALL_TOPICS = ['society', 'climate', 'economy', 'solar', 'methodology']

/**
 * 페이지 하단 "관련 토픽" 블록.
 * 현재 토픽을 제외한 나머지 4개를 링크로 표시.
 */
export default function CrossLinks({ current, lang }) {
  const others = ALL_TOPICS.filter(t => t !== current)
  const labels = TOPIC_LABELS[lang] ?? TOPIC_LABELS.ko
  const sectionTitle = lang === 'ko' ? '관련 토픽' : 'Related Topics'

  return (
    <section className="cross-links nes-container is-dark with-title">
      <p className="title">{sectionTitle}</p>
      <ul>
        {others.map(t => (
          <li key={t}>
            <a href={`/${lang}/about/${t}`}>{labels[t]} →</a>
          </li>
        ))}
      </ul>
    </section>
  )
}
