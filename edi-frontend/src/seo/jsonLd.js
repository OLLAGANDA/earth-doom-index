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

function bcp47(lang) {
  return lang === 'ko' ? 'ko-KR' : 'en-US'
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
    inLanguage: bcp47(lang),
    datePublished,
    url: `${SITE_URL}${path}`,
    image: `${SITE_URL}/api/og`,
    author: { '@id': `${SITE_URL}/#organization` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    isPartOf: { '@id': `${SITE_URL}/#website` },
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
    inLanguage: bcp47(lang),
    publisher: { '@id': `${SITE_URL}/#organization` },
  }
}

/**
 * CollectionPage — About 허브용. 토픽 묶음 페이지임을 명시.
 * hasPart는 자식 Article URL 목록 (참조 형태).
 */
export function collectionPageJsonLd({ name, description, path, lang, hasPartUrls }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: `${SITE_URL}${path}`,
    inLanguage: bcp47(lang),
    isPartOf: { '@id': `${SITE_URL}/#website` },
    hasPart: hasPartUrls.map(url => ({
      '@type': 'Article',
      url: `${SITE_URL}${url}`,
    })),
  }
}

/**
 * ItemList — About 허브에서 5개 토픽을 순서·이름·URL로 명시.
 * Google이 "이 5개가 묶음"이라고 이해하도록 cross-indexing 신호를 강화.
 */
export function itemListJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: `${SITE_URL}${item.path}`,
    })),
  }
}
