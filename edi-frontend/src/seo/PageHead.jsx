import { useEffect } from 'react'

const SITE_URL = 'https://www.earthdoomindex.com'

function setMeta(name, content, attr = 'name') {
  if (!content) return
  let el = document.head.querySelector(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function removeMeta(name, attr = 'name') {
  const el = document.head.querySelector(`meta[${attr}="${name}"]`)
  if (el) el.remove()
}

function setLink(rel, href, hreflang) {
  if (!href) return
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]`
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    if (hreflang) el.setAttribute('hreflang', hreflang)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * 페이지별 메타데이터 주입.
 *
 * @param title - <title> 태그
 * @param description - meta description
 * @param path - 사이트 루트 기준 경로 (예: "/ko/about/society")
 * @param koPath - 한국어 짝 경로 (없으면 path)
 * @param enPath - 영어 짝 경로 (없으면 path)
 * @param jsonLd - 구조화 데이터 객체 또는 배열 (없으면 생략)
 * @param noindex - true면 robots noindex,follow 메타 주입 (Phase 2: en placeholder용)
 */
export default function PageHead({ title, description, path, koPath, enPath, jsonLd, noindex }) {
  useEffect(() => {
    if (title) document.title = title

    setMeta('description', description)
    setMeta('og:title', title, 'property')
    setMeta('og:description', description, 'property')
    setMeta('og:url', `${SITE_URL}${path}`, 'property')
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)

    if (noindex) {
      setMeta('robots', 'noindex, follow')
    } else {
      removeMeta('robots')
    }

    setLink('canonical', `${SITE_URL}${path}`)
    setLink('alternate', `${SITE_URL}${koPath ?? path}`, 'ko')
    setLink('alternate', `${SITE_URL}${enPath ?? path}`, 'en')
    setLink('alternate', `${SITE_URL}${enPath ?? path}`, 'x-default')

    // JSON-LD
    const existingJsonLd = document.head.querySelectorAll('script[data-page-jsonld]')
    existingJsonLd.forEach(el => el.remove())
    if (jsonLd) {
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd]
      for (const item of items) {
        const script = document.createElement('script')
        script.type = 'application/ld+json'
        script.setAttribute('data-page-jsonld', 'true')
        script.textContent = JSON.stringify(item)
        document.head.appendChild(script)
      }
    }
  }, [title, description, path, koPath, enPath, jsonLd, noindex])

  // SSG 시점에는 useEffect가 안 돌므로, prerender HTML에 박히도록 정적 fallback 렌더
  return (
    <>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {noindex && <meta name="robots" content="noindex, follow" />}
      <link rel="canonical" href={`${SITE_URL}${path}`} />
      <link rel="alternate" hrefLang="ko" href={`${SITE_URL}${koPath ?? path}`} />
      <link rel="alternate" hrefLang="en" href={`${SITE_URL}${enPath ?? path}`} />
      <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${enPath ?? path}`} />
      {jsonLd && (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          data-page-jsonld="true"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  )
}
