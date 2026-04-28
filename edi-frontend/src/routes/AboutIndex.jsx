import { useOutletContext } from 'react-router-dom'
import PageHead from '../seo/PageHead.jsx'
import AboutCard from '../components/AboutCard.jsx'
import { breadcrumbJsonLd, organizationJsonLd } from '../seo/jsonLd.js'

const TOPICS = ['society', 'climate', 'economy', 'solar']

export default function AboutIndex() {
  const { lang, t } = useOutletContext()
  const a = t.about

  const title = lang === 'ko'
    ? 'Earth Doom Index 지표 설명 — 4개 위협 지수 측정 방식'
    : 'About — Earth Doom Index Methodology'

  const breadcrumb = breadcrumbJsonLd([
    { name: a.breadcrumbHome, path: `/${lang}` },
    { name: a.breadcrumbAbout, path: `/${lang}/about` },
  ])

  const leadParagraphs = a.indexLead.split('\n\n')
  const metaDescription = leadParagraphs[0]

  return (
    <>
      <PageHead
        title={title}
        description={metaDescription}
        path={`/${lang}/about`}
        koPath="/ko/about"
        enPath="/en/about"
        jsonLd={[organizationJsonLd(), breadcrumb]}
        noindex={lang === 'en'}
      />
      <main className="about-index">
        <h1>{a.indexTitle}</h1>
        <div className="about-lead">
          {leadParagraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        <div className="about-cards">
          {TOPICS.map(topic => (
            <AboutCard
              key={topic}
              lang={lang}
              topic={topic}
              label={a.topicLabels[topic]}
              description={a.topicShortDesc[topic]}
            />
          ))}
        </div>
        <div className="about-methodology">
          <AboutCard
            lang={lang}
            topic="methodology"
            label={a.topicLabels.methodology}
            description={a.topicShortDesc.methodology}
          />
        </div>
      </main>
    </>
  )
}
