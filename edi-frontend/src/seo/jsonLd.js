const SITE_URL = 'https://www.earthdoomindex.com'

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Earth Doom Index',
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  sameAs: [
    'https://github.com/OLLAGANDA/earth-doom-index',
  ],
}

export function organizationJsonLd() {
  return { '@context': 'https://schema.org', ...ORGANIZATION }
}

/**
 * Article 스키마 — about/{topic} 페이지용.
 */
export function articleJsonLd({ title, description, path, datePublished, lang }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    inLanguage: lang,
    datePublished,
    url: `${SITE_URL}${path}`,
    author: ORGANIZATION,
    publisher: ORGANIZATION,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}${path}`,
    },
  }
}

/**
 * BreadcrumbList — about 페이지용.
 *
 * @param items - [{ name, path }, ...] 순서대로 (홈 → 부모 → 현재)
 */
export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}

/**
 * WebSite — 사이트 전체를 식별. 홈 페이지에 한 번 게시하고,
 * 다른 페이지는 isPartOf로 @id 참조만 한다.
 */
export function websiteJsonLd(lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: 'Earth Doom Index',
    alternateName: lang === 'ko' ? '지구 멸망 지수' : 'Earth Doom Index',
    inLanguage: lang === 'ko' ? 'ko-KR' : 'en-US',
    publisher: { '@id': `${SITE_URL}/#organization` },
  }
}
