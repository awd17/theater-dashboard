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
  | 'operating_cash_flow'
  | 'capex'
  | 'operating_lease_noncurrent'
  | 'operating_lease_current'
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
  { metric: 'operating_cash_flow', taxonomy: 'us-gaap', concept: 'NetCashProvidedByUsedInOperatingActivities', unit: 'USD' },
  { metric: 'operating_cash_flow', taxonomy: 'us-gaap', concept: 'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations', unit: 'USD' },
  { metric: 'capex', taxonomy: 'us-gaap', concept: 'PaymentsToAcquirePropertyPlantAndEquipment', unit: 'USD' },
  { metric: 'capex', taxonomy: 'us-gaap', concept: 'PaymentsToAcquireProductiveAssets', unit: 'USD' },
  { metric: 'operating_lease_noncurrent', taxonomy: 'us-gaap', concept: 'OperatingLeaseLiabilityNoncurrent', unit: 'USD' },
  { metric: 'operating_lease_current', taxonomy: 'us-gaap', concept: 'OperatingLeaseLiabilityCurrent', unit: 'USD' },
  { metric: 'shares_outstanding', taxonomy: 'dei', concept: 'EntityCommonStockSharesOutstanding', unit: 'shares' },
]

export function companyFactsUrl(cik: string): string {
  return `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`
}

export function submissionsUrl(cik: string): string {
  return `https://data.sec.gov/submissions/CIK${cik}.json`
}

export function filingDocumentUrl(cik: string, accession: string, document: string): string {
  const cikNumber = Number(cik)
  const accessionNoDashes = accession.replaceAll('-', '')
  return `https://www.sec.gov/Archives/edgar/data/${cikNumber}/${accessionNoDashes}/${document}`
}

export function secUserAgent(): string {
  const contact = process.env.SEC_EDGAR_CONTACT ?? 'unconfigured@example.com'
  return `theater-industry-dashboard/0.1 (${contact})`
}
