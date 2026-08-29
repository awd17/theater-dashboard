export const SEC_SOURCE = 'sec_edgar' as const

export interface SecCompany {
  ticker: string
  name: string
  cik: string
}

export const SEC_COMPANIES: SecCompany[] = [
  { ticker: 'AMC', name: 'AMC Entertainment', cik: '0001411579' },
  { ticker: 'CNK', name: 'Cinemark', cik: '0001385280' },
  { ticker: 'MCS', name: 'Marcus', cik: '0000062234' },
]

export type OperatorMetric =
  | 'revenue'
  | 'operating_income'
  | 'net_income'
  | 'cash'
  | 'long_term_debt_noncurrent'
  | 'long_term_debt_current'
  | 'interest_expense'
  | 'capex'
  | 'shares_outstanding'

export interface MetricConcept {
  metric: OperatorMetric
  taxonomy: 'us-gaap' | 'dei'
  concept: string
  unit: 'USD' | 'shares'
}

export const SEC_METRIC_CONCEPTS: MetricConcept[] = [
  { metric: 'revenue', taxonomy: 'us-gaap', concept: 'Revenues', unit: 'USD' },
  { metric: 'revenue', taxonomy: 'us-gaap', concept: 'RevenueFromContractWithCustomerExcludingAssessedTax', unit: 'USD' },
  { metric: 'operating_income', taxonomy: 'us-gaap', concept: 'OperatingIncomeLoss', unit: 'USD' },
  { metric: 'net_income', taxonomy: 'us-gaap', concept: 'NetIncomeLoss', unit: 'USD' },
  { metric: 'cash', taxonomy: 'us-gaap', concept: 'CashAndCashEquivalentsAtCarryingValue', unit: 'USD' },
  { metric: 'long_term_debt_noncurrent', taxonomy: 'us-gaap', concept: 'LongTermDebtNoncurrent', unit: 'USD' },
  { metric: 'long_term_debt_current', taxonomy: 'us-gaap', concept: 'LongTermDebtCurrent', unit: 'USD' },
  { metric: 'interest_expense', taxonomy: 'us-gaap', concept: 'InterestExpenseDebt', unit: 'USD' },
  { metric: 'interest_expense', taxonomy: 'us-gaap', concept: 'InterestExpenseNonoperating', unit: 'USD' },
  { metric: 'interest_expense', taxonomy: 'us-gaap', concept: 'InterestExpense', unit: 'USD' },
  { metric: 'capex', taxonomy: 'us-gaap', concept: 'PaymentsToAcquirePropertyPlantAndEquipment', unit: 'USD' },
  { metric: 'capex', taxonomy: 'us-gaap', concept: 'PaymentsToAcquireProductiveAssets', unit: 'USD' },
  { metric: 'shares_outstanding', taxonomy: 'dei', concept: 'EntityCommonStockSharesOutstanding', unit: 'shares' },
]

export function companyFactsUrl(cik: string): string {
  return `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`
}

export function secUserAgent(): string {
  const contact = process.env.SEC_EDGAR_CONTACT
  return contact
    ? `theater-industry-dashboard/0.1 (${contact})`
    : 'theater-industry-dashboard/0.1 (local research tool)'
}
