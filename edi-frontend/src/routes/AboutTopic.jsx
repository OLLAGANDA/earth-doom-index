import { useOutletContext, useParams, Navigate } from 'react-router-dom'
import { lazy, Suspense, useMemo } from 'react'

const VALID_TOPICS = ['society', 'climate', 'economy', 'solar', 'methodology']

// MDX 파일을 동적 import — Vite가 빌드 시점에 코드 스플리팅
const mdxModules = import.meta.glob('../content/*/*.mdx')

function loadMdx(lang, topic) {
  const path = `../content/${lang}/${topic}.mdx`
  const loader = mdxModules[path]
  if (!loader) return null
  return lazy(() => loader())
}

export default function AboutTopic() {
  const { lang, t } = useOutletContext()
  const { topic } = useParams()

  if (!VALID_TOPICS.includes(topic)) {
    return <Navigate to={`/${lang}/about`} replace />
  }

  const MdxComponent = useMemo(() => loadMdx(lang, topic), [lang, topic])

  if (!MdxComponent) {
    return <Navigate to={`/${lang}/about`} replace />
  }

  return (
    <main className="about-topic">
      <nav className="breadcrumb">
        <a href={`/${lang}`}>{lang === 'ko' ? '홈' : 'Home'}</a>
        {' > '}
        <a href={`/${lang}/about`}>{lang === 'ko' ? '지표 설명' : 'About'}</a>
        {' > '}
        <span>{topic}</span>
      </nav>
      <Suspense fallback={<p>Loading...</p>}>
        <MdxComponent />
      </Suspense>
    </main>
  )
}
