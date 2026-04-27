import { useOutletContext } from 'react-router-dom'
import PageHead from '../seo/PageHead.jsx'
import { breadcrumbJsonLd, organizationJsonLd } from '../seo/jsonLd.js'

export default function AboutIndex() {
  const { lang } = useOutletContext()

  const title = lang === 'ko'
    ? 'Earth Doom Index 지표 설명'
    : 'About — Earth Doom Index'
  const description = lang === 'ko'
    ? '사회·기후·경제·태양 4개 영역의 위협 지수 측정 방식과 데이터 출처를 자세히 알아보세요.'
    : 'How the four threat indices of Earth Doom Index (society, climate, economy, solar) are measured and sourced.'

  const breadcrumb = breadcrumbJsonLd([
    { name: lang === 'ko' ? '홈' : 'Home', path: `/${lang}` },
    { name: lang === 'ko' ? '지표 설명' : 'About', path: `/${lang}/about` },
  ])

  return (
    <>
      <PageHead
        title={title}
        description={description}
        path={`/${lang}/about`}
        koPath="/ko/about"
        enPath="/en/about"
        jsonLd={[organizationJsonLd(), breadcrumb]}
      />
      <main className="about-index">
        <h1>{lang === 'ko' ? '지표 설명' : 'About the Indices'}</h1>
        <p>{description}</p>
      </main>
    </>
  )
}
