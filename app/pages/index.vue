<script setup lang="ts">
const orpc = useORPC()

const { data: health, error: healthError, status: healthStatus } = await useAsyncData(
  'health',
  () => orpc.health(),
)

const { data: industry, error: industryError, status: industryStatus } = await useAsyncData(
  'industry-snapshot',
  () => orpc.industry.snapshot(),
)

const today = new Date().toISOString().slice(0, 10)

const { data: outlook, error: outlookError, status: outlookStatus } = await useAsyncData(
  'outlook-snapshot',
  () => orpc.outlook.snapshot({ asOfDate: today }),
)

const { data: operators, error: operatorsError, status: operatorsStatus } = await useAsyncData(
  'operators-snapshot',
  () => orpc.operators.snapshot(),
)

const { data: operatorHistory } = await useAsyncData(
  'operators-history',
  () => orpc.operators.history(),
)

function formatUsd(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '—'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatUsdMillions(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '—'
  }
  return `$${(cents / 100 / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`
}

function formatRatio(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined) {
    return '—'
  }
  return `${(ratio * 100).toFixed(1)}%`
}

function formatSignedRatio(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined) {
    return '—'
  }
  const formatted = `${(ratio * 100).toFixed(1)}%`
  return ratio > 0 ? `+${formatted}` : formatted
}

function formatBillions(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '—'
  }
  return `$${(cents / 100 / 1_000_000_000).toFixed(2)}B`
}

function formatMillionsCount(count: number | null | undefined): string {
  if (count === null || count === undefined) {
    return '—'
  }
  return `${(count / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`
}

function formatUsdExact(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '—'
  }
  return `$${(cents / 100).toFixed(2)}`
}

const recentMarketYears = computed(() =>
  (industry.value?.marketYears ?? []).slice(-12).reverse(),
)

const revenueTrend = computed(() => {
  const history = operatorHistory.value?.operators ?? []
  if (history.length === 0) {
    return null
  }

  const labels = [...new Set(
    history.flatMap((operator) => operator.quarters.map((quarter) => quarter.label)),
  )]
  const labelOrder = new Map(
    history.flatMap((operator) =>
      operator.quarters.map((quarter) => [quarter.label, quarter.periodEnd] as const),
    ),
  )
  labels.sort((a, b) => (labelOrder.get(b) ?? '').localeCompare(labelOrder.get(a) ?? ''))

  const rows = labels.slice(0, 8).map((label) => ({
    label,
    cells: history.map((operator) =>
      operator.quarters.find((quarter) => quarter.label === label)?.revenueCents ?? null,
    ),
  }))

  return { tickers: history.map((operator) => operator.ticker), rows }
})
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">
        Dashboard
      </h1>
      <p class="text-sm text-muted-foreground">
        Theatrical industry analytics from public data.
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>System status</CardTitle>
          <CardDescription>
            Health check through oRPC against the local D1 binding.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3 text-sm">
          <p v-if="healthStatus === 'pending'">
            Checking services...
          </p>
          <p v-else-if="healthError">
            RPC is unavailable.
          </p>
          <template v-else-if="health">
            <p>API is ready.</p>
            <p>
              Database is {{ health.database }}.
            </p>
          </template>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Industry snapshot</CardTitle>
          <CardDescription>
            Domestic box office derived from The Numbers observations.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3 text-sm">
          <p v-if="industryStatus === 'pending'">
            Loading industry metrics...
          </p>
          <p v-else-if="industryError">
            Industry snapshot is unavailable.
          </p>
          <template v-else-if="industry">
            <p>
              Latest day:
              {{ industry.latestObservationDate ?? '—' }}
              ·
              {{ formatUsd(industry.latestDailyTotalCents) }}
            </p>
            <p>
              YTD:
              {{ formatUsd(industry.ytdBoxOfficeCents) }}
              · YoY:
              {{ formatRatio(industry.yoyGrowthRatio) }}
            </p>
            <p>
              Top-10 concentration:
              {{ formatRatio(industry.top10Concentration) }}
            </p>
            <p>
              Recovery vs 2019<span v-if="industry.recoveryPeriodLabel"> ({{ industry.recoveryPeriodLabel }})</span>:
              {{ formatRatio(industry.recoveryVs2019Ratio) }}
            </p>
            <p class="text-muted-foreground">
              Recovery uses The Numbers box-office-year market totals, not calendar-year sums of daily charts.
            </p>
          </template>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outlook</CardTitle>
          <CardDescription>
            Upcoming US theatrical releases from TMDB.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3 text-sm">
          <p v-if="outlookStatus === 'pending'">
            Loading outlook...
          </p>
          <p v-else-if="outlookError">
            Outlook is unavailable.
          </p>
          <template v-else-if="outlook">
            <p>
              Next 30 / 90 / 180 days:
              {{ outlook.next30DayCount }} / {{ outlook.next90DayCount }} / {{ outlook.next180DayCount }} releases
            </p>
            <p>
              Expected wide releases next 90 days: {{ outlook.next90DayWideCount }}
            </p>
            <div v-if="outlook.upcomingWideReleases.length > 0">
              <p class="font-medium">
                Next wide releases
              </p>
              <ul class="mt-1 space-y-1 text-muted-foreground">
                <li v-for="release in outlook.upcomingWideReleases" :key="release.title + release.releaseDate">
                  {{ release.releaseDate }} · {{ release.title }}
                </li>
              </ul>
            </div>
            <p class="text-muted-foreground">
              Counts are unique films with confirmed US theatrical dates on TMDB.
              Wide means the traditional 600+ theater definition, proxied pre-release by
              excluding re-releases and low-traction titles; theater counts only confirm
              wide status after opening.
            </p>
          </template>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operators</CardTitle>
          <CardDescription>
            Latest reported quarter per exhibitor from SEC EDGAR filings.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3 text-sm">
          <p v-if="operatorsStatus === 'pending'">
            Loading operators...
          </p>
          <p v-else-if="operatorsError">
            Operator comparison is unavailable.
          </p>
          <template v-else-if="operators && operators.operators.length > 0">
            <p class="font-medium">Operations & monetization</p>
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="border-b text-muted-foreground">
                    <th class="py-1 pr-3 font-medium">Company</th>
                    <th class="py-1 pr-3 font-medium">Quarter</th>
                    <th class="py-1 pr-3 font-medium">Revenue</th>
                    <th class="py-1 pr-3 font-medium">YoY</th>
                    <th class="py-1 pr-3 font-medium">Attendance</th>
                    <th class="py-1 pr-3 font-medium">Admissions</th>
                    <th class="py-1 pr-3 font-medium">F&B</th>
                    <th class="py-1 pr-3 font-medium">Avg ticket</th>
                    <th class="py-1 pr-3 font-medium">F&B/patron</th>
                    <th class="py-1 font-medium">Rev/patron</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="operator in operators.operators" :key="operator.ticker" class="border-b last:border-0">
                    <td class="py-1.5 pr-3">{{ operator.ticker }}</td>
                    <td class="py-1.5 pr-3">{{ operator.latestQuarterLabel ?? '—' }}</td>
                    <td class="py-1.5 pr-3">{{ formatUsdMillions(operator.revenueCents) }}</td>
                    <td class="py-1.5 pr-3">{{ formatSignedRatio(operator.revenueYoyRatio) }}</td>
                    <td class="py-1.5 pr-3">
                      {{ formatMillionsCount(operator.attendanceCount) }}<template v-if="operator.attendanceYoyRatio !== null">
                        · {{ formatSignedRatio(operator.attendanceYoyRatio) }}
                      </template>
                    </td>
                    <td class="py-1.5 pr-3">{{ formatUsdMillions(operator.admissionsRevenueCents) }}</td>
                    <td class="py-1.5 pr-3">{{ formatUsdMillions(operator.foodBeverageRevenueCents) }}</td>
                    <td class="py-1.5 pr-3">{{ formatUsdExact(operator.averageTicketPriceCents) }}</td>
                    <td class="py-1.5 pr-3">{{ formatUsdExact(operator.foodBeveragePerPatronCents) }}</td>
                    <td class="py-1.5">{{ formatUsdExact(operator.revenuePerPatronCents) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="pt-2 font-medium">Profitability & financial position</p>
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="border-b text-muted-foreground">
                    <th class="py-1 pr-3 font-medium">Company</th>
                    <th class="py-1 pr-3 font-medium">Net income</th>
                    <th class="py-1 pr-3 font-medium">Interest</th>
                    <th class="py-1 pr-3 font-medium">Op cash flow</th>
                    <th class="py-1 pr-3 font-medium">Capex</th>
                    <th class="py-1 pr-3 font-medium">FCF</th>
                    <th class="py-1 pr-3 font-medium">Cash</th>
                    <th class="py-1 pr-3 font-medium">LT debt</th>
                    <th class="py-1 font-medium">Op leases</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="operator in operators.operators" :key="operator.ticker" class="border-b last:border-0">
                    <td class="py-1.5 pr-3">{{ operator.ticker }}</td>
                    <td class="py-1.5 pr-3">{{ formatUsdMillions(operator.netIncomeCents) }}</td>
                    <td class="py-1.5 pr-3">{{ formatUsdMillions(operator.interestExpenseCents) }}</td>
                    <td class="py-1.5 pr-3">{{ formatUsdMillions(operator.operatingCashFlowCents) }}</td>
                    <td class="py-1.5 pr-3">{{ formatUsdMillions(operator.capexCents) }}</td>
                    <td class="py-1.5 pr-3">{{ formatUsdMillions(operator.freeCashFlowCents) }}</td>
                    <td class="py-1.5 pr-3">{{ formatUsdMillions(operator.cashCents) }}</td>
                    <td class="py-1.5 pr-3">{{ formatUsdMillions(operator.longTermDebtCents) }}</td>
                    <td class="py-1.5">{{ formatUsdMillions(operator.operatingLeaseCents) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <template v-if="revenueTrend && revenueTrend.rows.length > 0">
              <p class="pt-2 font-medium">Quarterly revenue trend</p>
              <div class="overflow-x-auto">
                <table class="w-full text-left">
                  <thead>
                    <tr class="border-b text-muted-foreground">
                      <th class="py-1 pr-3 font-medium">Quarter</th>
                      <th v-for="ticker in revenueTrend.tickers" :key="ticker" class="py-1 pr-3 font-medium">
                        {{ ticker }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in revenueTrend.rows" :key="row.label" class="border-b last:border-0">
                      <td class="py-1.5 pr-3">{{ row.label }}</td>
                      <td v-for="(cell, index) in row.cells" :key="revenueTrend.tickers[index]" class="py-1.5 pr-3">
                        {{ formatUsdMillions(cell) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
            <p class="text-muted-foreground">
              Financials come from standardized XBRL company facts; attendance and the
              admissions/F&B revenue split are parsed from 10-Q tables. Per-patron
              figures are derived only when the periods match. Missing cells mean the
              company did not report the value in recent filings.
            </p>
          </template>
          <p v-else>
            No operator data ingested yet.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Annual market history</CardTitle>
          <CardDescription>
            Domestic box-office years from The Numbers market pages.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3 text-sm">
          <p v-if="industryStatus === 'pending'">
            Loading market history...
          </p>
          <p v-else-if="industryError">
            Market history is unavailable.
          </p>
          <template v-else-if="recentMarketYears.length > 0">
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="border-b text-muted-foreground">
                    <th class="py-1 pr-3 font-medium">Year</th>
                    <th class="py-1 pr-3 font-medium">Box office</th>
                    <th class="py-1 pr-3 font-medium">YoY</th>
                    <th class="py-1 pr-3 font-medium">Tickets</th>
                    <th class="py-1 font-medium">Avg price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="year in recentMarketYears" :key="year.periodLabel" class="border-b last:border-0">
                    <td class="py-1.5 pr-3">
                      {{ year.periodLabel }}<span v-if="year.isPartial" class="text-muted-foreground"> (partial)</span>
                    </td>
                    <td class="py-1.5 pr-3">{{ formatBillions(year.boxOfficeCents) }}</td>
                    <td class="py-1.5 pr-3">{{ formatSignedRatio(year.yoyGrowthRatio) }}</td>
                    <td class="py-1.5 pr-3">{{ formatMillionsCount(year.ticketsSold) }}</td>
                    <td class="py-1.5">{{ formatUsdExact(year.averageTicketPriceCents) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <template v-if="industry?.distributorShares">
              <p class="pt-2 font-medium">
                Distributor market share
                ({{ industry.distributorShares.periodLabel }}<template v-if="industry.distributorShares.isPartial"> partial</template>)
              </p>
              <div class="overflow-x-auto">
                <table class="w-full text-left">
                  <thead>
                    <tr class="border-b text-muted-foreground">
                      <th class="py-1 pr-3 font-medium">Distributor</th>
                      <th class="py-1 pr-3 font-medium">Share</th>
                      <th class="py-1 pr-3 font-medium">Box office</th>
                      <th class="py-1 font-medium">Titles</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="entry in industry.distributorShares.entries"
                      :key="entry.distributor"
                      class="border-b last:border-0"
                    >
                      <td class="py-1.5 pr-3">{{ entry.distributor }}</td>
                      <td class="py-1.5 pr-3">{{ formatRatio(entry.share) }}</td>
                      <td class="py-1.5 pr-3">{{ formatUsdMillions(entry.boxOfficeCents) }}</td>
                      <td class="py-1.5">{{ entry.titleCount }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
            <p class="text-muted-foreground">
              Totals aggregate each year's top-grossing chart on The Numbers, so early
              years with fewer tracked titles understate the full market.
            </p>
          </template>
          <p v-else>
            No market history ingested yet.
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
