import { useOutletContext, useParams, Navigate } from 'react-router-dom'
import { lazy, Suspense, useMemo } from 'react'
import PageHead from '../seo/PageHead.jsx'
import { articleJsonLd, breadcrumbJsonLd, organizationJsonLd } from '../seo/jsonLd.js'

const VALID_TOPICS = ['society', 'climate', 'economy', 'solar', 'methodology']
const mdxModules = import.meta.glob('../content/*/*.mdx')
const mdxMeta = import.meta.glob('../content/*/*.mdx', { import: 'meta', eager: true })

function loadMdx(lang, topic) {
  const path = `../content/${lang}/${topic}.mdx`
  const loader = mdxModules[path]
  if (!loader) return null
  return {
    Component: lazy(() => loader().then(m => ({ default: m.default }))),
    meta: mdxMeta[path] ?? {},
  }
}

export default function AboutTopic() {
  const { lang, t } = useOutletContext()
  const { topic } = useParams()

  const a = t.about
  const valid = VALID_TOPICS.includes(topic)
  const loaded = useMemo(() => (valid ? loadMdx(lang, topic) : null), [valid, lang, topic])

  if (!valid || !loaded) {
    return <Navigate to={`/${lang}/about`} replace />
  }

  const { meta } = loaded
  const path = `/${lang}/about/${topic}`
  const koPath = `/ko/about/${topic}`
  const enPath = `/en/about/${topic}`

  const breadcrumb = breadcrumbJsonLd([
    { name: a.breadcrumbHome, path: `/${lang}` },
    { name: a.breadcrumbAbout, path: `/${lang}/about` },
    { name: a.topicLabels[topic], path },
  ])
  const article = articleJsonLd({
    title: meta.title,
    description: meta.description,
    path,
    datePublished: meta.publishedAt,
    lang,
  })

  return (
    <>
      <PageHead
        title={meta.title}
        description={meta.description}
        path={path}
        koPath={koPath}
        enPath={enPath}
        jsonLd={[organizationJsonLd(), breadcrumb, article]}
      />
      <main className="about-topic">
        <nav className="breadcrumb">
          <a href={`/${lang}`}>{a.breadcrumbHome}</a>
          {' > '}
          <a href={`/${lang}/about`}>{a.breadcrumbAbout}</a>
          {' > '}
          <span>{a.topicLabels[topic]}</span>
        </nav>
        <Suspense fallback={<p>Loading...</p>}>
          <loaded.Component />
        </Suspense>
      </main>
    </>
  )
}
