const DOMAIN_SUFFIX_HINTS = [
  'propiedades',
  'properties',
  'realty',
  'dental',
  'clinic',
  'group',
  'studio',
  'studios',
  'homes',
] as const

function normalizeSlugParts(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .filter(Boolean)
}

export function slugifyClientName(value: string) {
  const parts = normalizeSlugParts(value)
  return parts.length > 0 ? parts.join('-') : 'generic-client'
}

export function slugifyHostnameLabel(hostname: string) {
  const baseLabel = hostname.toLowerCase().replace(/^www\./, '').split('.')[0] ?? hostname

  for (const hint of DOMAIN_SUFFIX_HINTS) {
    if (baseLabel.endsWith(hint) && baseLabel.length > hint.length) {
      const prefix = baseLabel.slice(0, baseLabel.length - hint.length)
      return slugifyClientName(`${prefix} ${hint}`)
    }
  }

  return slugifyClientName(baseLabel)
}
