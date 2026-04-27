const SITE_URL = 'https://www.earthdoomindex.com'

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Earth Doom Index',
  url: SITE_URL,
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
