import { Head } from 'vite-react-ssg'

const SITE_URL = 'https://www.earthdoomindex.com'

/**
 * 페이지별 메타데이터를 실제 <head>에 주입.
 *
 * - vite-react-ssg의 <Head> (react-helmet 래퍼) 사용. SSG 시점에 prerender HTML의
 *   <head>로 들어가고, 클라이언트에서도 helmet이 라우트 변경에 따라 갱신한다.
 * - <html lang>도 helmet 표준으로 라우트 언어에 맞춰 덮어쓴다.
 *
 * @param lang - 'ko' | 'en' — <html lang>과 og:locale에 사용
 * @param title - <title>
 * @param description - meta description
 * @param path - 사이트 루트 기준 경로 (canonical)
 * @param koPath - 한국어 짝 경로 (없으면 path)
 * @param enPath - 영어 짝 경로 (없으면 path)
 * @param jsonLd - 구조화 데이터 객체 또는 배열
 * @param noindex - true면 robots noindex,follow
 */
export default function PageHead({
  lang = 'en',
  title,
  description,
  path,
  koPath,
  enPath,
  jsonLd,
  noindex,
}) {
  const ko = koPath ?? path
  const en = enPath ?? path
  const items = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []

  return (
    <Head>
      <html lang={lang} />
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      <meta name="robots" content={noindex ? 'noindex, follow' : 'index, follow'} />

      <link rel="canonical" href={`${SITE_URL}${path}`} />
      <link rel="alternate" hrefLang="ko" href={`${SITE_URL}${ko}`} />
      <link rel="alternate" hrefLang="en" href={`${SITE_URL}${en}`} />
      <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${en}`} />

      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={`${SITE_URL}${path}`} />
      <meta property="og:locale" content={lang === 'ko' ? 'ko_KR' : 'en_US'} />
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}

      {items.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Head>
  )
}
