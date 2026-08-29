export function formatUsd(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '—'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function formatUsdCompact(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '—'
  }
  const dollars = cents / 100
  const abs = Math.abs(dollars)
  if (abs >= 1_000_000_000) {
    return `$${(dollars / 1_000_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}B`
  }
  if (abs >= 1_000_000) {
    return `$${(dollars / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`
  }
  if (abs >= 1_000) {
    return `$${(dollars / 1_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`
  }
  return formatUsd(cents)
}

export function formatUsdMillions(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '—'
  }
  return `$${(cents / 100 / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`
}

export function formatBillions(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '—'
  }
  return `$${(cents / 100 / 1_000_000_000).toFixed(2)}B`
}

export function formatUsdExact(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '—'
  }
  return `$${(cents / 100).toFixed(2)}`
}

export function formatRatio(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined) {
    return '—'
  }
  return `${(ratio * 100).toFixed(1)}%`
}

export function formatSignedRatio(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined) {
    return '—'
  }
  const formatted = `${(ratio * 100).toFixed(1)}%`
  return ratio > 0 ? `+${formatted}` : formatted
}

export function formatCount(count: number | null | undefined): string {
  if (count === null || count === undefined) {
    return '—'
  }
  return count.toLocaleString('en-US')
}

export function formatMillionsCount(count: number | null | undefined): string {
  if (count === null || count === undefined) {
    return '—'
  }
  return `${(count / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`
}

export function formatTheatresScreens(
  theatres: number | null,
  screens: number | null,
): string {
  if (theatres === null && screens === null) {
    return '—'
  }
  if (theatres === null) {
    return formatCount(screens)
  }
  if (screens === null) {
    return formatCount(theatres)
  }
  return `${formatCount(theatres)} · ${formatCount(screens)}`
}

export function formatShares(count: number | null | undefined): string {
  if (count === null || count === undefined) {
    return '—'
  }
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}B`
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`
  }
  return formatCount(count)
}

export function deltaTone(ratio: number | null | undefined): 'positive' | 'negative' | 'neutral' {
  if (ratio === null || ratio === undefined || ratio === 0) {
    return 'neutral'
  }
  return ratio > 0 ? 'positive' : 'negative'
}
