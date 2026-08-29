export const THE_NUMBERS_SOURCE = 'the_numbers' as const
export const DOMESTIC_TERRITORY = 'domestic' as const
export const USD = 'USD' as const
export const MARKET_PERIOD_KIND = 'the_numbers_box_office_year' as const

export const THE_NUMBERS_ORIGIN = 'https://www.the-numbers.com'

export function dailyChartUrl(date: string): string {
  const [year, month, day] = date.split('-')
  return `${THE_NUMBERS_ORIGIN}/box-office-chart/daily/${year}/${month}/${day}`
}

export function marketYearUrl(year: number): string {
  return `${THE_NUMBERS_ORIGIN}/market/${year}/top-grossing-movies`
}

export function absoluteTheNumbersUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${THE_NUMBERS_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}
