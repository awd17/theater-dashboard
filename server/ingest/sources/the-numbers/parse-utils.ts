export function parseMoneyToCents(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, '').replace(/–|—|-/g, '').trim()
  if (!cleaned || cleaned === '') {
    return null
  }
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return null
  }
  const dollars = Number(cleaned)
  if (!Number.isFinite(dollars)) {
    return null
  }
  return Math.round(dollars * 100)
}

export function parseInteger(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, '').replace(/–|—/g, '').trim()
  if (!cleaned || cleaned === '-' || cleaned === '') {
    return null
  }
  if (!/^\d+$/.test(cleaned)) {
    return null
  }
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

export function parseRank(raw: string): number | null {
  const cleaned = raw.trim()
  if (!cleaned || cleaned === '-' || cleaned === '–' || cleaned === '—') {
    return null
  }
  return parseInteger(cleaned)
}

export function extractMovieSlug(href: string): string | null {
  const match = href.match(/\/movie\/([^/?#]+)/)
  return match?.[1] ?? null
}
