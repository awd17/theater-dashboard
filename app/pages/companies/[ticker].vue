<script setup lang="ts">
import {
  formatCount,
  formatMillionsCount,
  formatQuarterIdentity,
  formatQuarterPeriodRange,
  formatShares,
  formatSignedRatio,
  formatTheatresScreens,
  formatUsdExact,
  formatUsdMillions,
} from '@/lib/format'

const route = useRoute()
const orpc = useORPC()

const ticker = computed(() => String(route.params.ticker ?? '').toUpperCase())

useHead({
  title: computed(() => ticker.value || 'Companies'),
})

const { data: listing } = await useRpcData(
  'operators-for-nav',
  () => orpc.operators.snapshot(),
)

const companyTickers = computed(() =>
  (listing.value?.operators ?? []).map((operator) => operator.ticker),
)

const { data: detail, status } = await useRpcData(
  () => `operator-detail-${ticker.value}`,
  () => orpc.operators.detail({ ticker: ticker.value }),
  { watch: [ticker] },
)

const latest = computed(() => detail.value?.latest ?? null)
const quarters = computed(() => detail.value?.quarters ?? [])
const loading = computed(() => status.value === 'pending')
const isAmc = computed(() => ticker.value === 'AMC')

const latestIdentity = computed(() => {
  const entry = latest.value
  if (!entry) {
    return null
  }
  return {
    label: entry.latestQuarterLabel,
    periodEnd: entry.latestQuarterEnd,
    fiscalYear: entry.latestFiscalYear,
    fiscalPeriod: entry.latestFiscalPeriod,
    calendarLabel: entry.latestCalendarLabel,
  }
})

const latestRange = computed(() => {
  const entry = latest.value
  if (!entry) {
    return null
  }
  return { periodStart: entry.latestPeriodStart, periodEnd: entry.latestQuarterEnd }
})

function footprintIdentity(quarter: { label: string, periodEnd: string, fiscalYear: number | null, fiscalPeriod: string | null, calendarLabel: string }): string {
  return formatQuarterIdentity(quarter)
}
const operatingLines = computed(() => [
  {
    key: 'attendance',
    label: 'Attendance (M)',
    color: 'var(--chart-2)',
    points: quarters.value.map((quarter) => ({
      label: quarter.label,
      value: quarter.attendanceCount === null ? null : quarter.attendanceCount / 1_000_000,
    })),
  },
  {
    key: 'revPerPatron',
    label: 'Rev / patron ($)',
    color: 'var(--chart-4)',
    points: quarters.value.map((quarter) => ({
      label: quarter.label,
      value: quarter.revenuePerPatronCents === null ? null : quarter.revenuePerPatronCents / 100,
    })),
  },
])

const profitLines = computed(() => [
  {
    key: 'revenue',
    label: 'Revenue ($M)',
    color: 'var(--chart-2)',
    points: quarters.value.map((quarter) => ({
      label: quarter.label,
      value: quarter.revenueCents / 100 / 1_000_000,
    })),
  },
  {
    key: 'operatingIncome',
    label: 'Operating income ($M)',
    color: 'var(--chart-4)',
    points: quarters.value.map((quarter) => ({
      label: quarter.label,
      value: quarter.operatingIncomeCents === null
        ? null
        : quarter.operatingIncomeCents / 100 / 1_000_000,
    })),
  },
  {
    key: 'netIncome',
    label: 'Net income ($M)',
    color: 'var(--chart-5)',
    points: quarters.value.map((quarter) => ({
      label: quarter.label,
      value: quarter.netIncomeCents === null ? null : quarter.netIncomeCents / 100 / 1_000_000,
    })),
  },
])

const cashLines = computed(() => [
  {
    key: 'ocf',
    label: 'Op cash flow ($M)',
    color: 'var(--chart-2)',
    points: quarters.value.map((quarter) => ({
      label: quarter.label,
      value: quarter.operatingCashFlowCents === null
        ? null
        : quarter.operatingCashFlowCents / 100 / 1_000_000,
    })),
  },
  {
    key: 'capex',
    label: 'Capex ($M)',
    color: 'var(--chart-5)',
    points: quarters.value.map((quarter) => ({
      label: quarter.label,
      value: quarter.capexCents === null ? null : quarter.capexCents / 100 / 1_000_000,
    })),
  },
  {
    key: 'fcf',
    label: 'Free cash flow ($M)',
    color: 'var(--chart-4)',
    points: quarters.value.map((quarter) => ({
      label: quarter.label,
      value: quarter.freeCashFlowCents === null ? null : quarter.freeCashFlowCents / 100 / 1_000_000,
    })),
  },
])

const capitalLines = computed(() => [
  {
    key: 'cash',
    label: 'Cash ($M)',
    color: 'var(--chart-4)',
    points: quarters.value.map((quarter) => ({
      label: quarter.label,
      value: quarter.cashCents === null ? null : quarter.cashCents / 100 / 1_000_000,
    })),
  },
  {
    key: 'debt',
    label: 'LT debt ($M)',
    color: 'var(--chart-5)',
    points: quarters.value.map((quarter) => ({
      label: quarter.label,
      value: quarter.longTermDebtCents === null ? null : quarter.longTermDebtCents / 100 / 1_000_000,
    })),
  },
  {
    key: 'interest',
    label: 'Interest ($M)',
    color: 'var(--chart-3)',
    points: quarters.value.map((quarter) => ({
      label: quarter.label,
      value: quarter.interestExpenseCents === null
        ? null
        : quarter.interestExpenseCents / 100 / 1_000_000,
    })),
  },
  {
    key: 'shares',
    label: 'Shares (M)',
    color: 'var(--chart-2)',
    points: quarters.value.map((quarter) => ({
      label: quarter.label,
      value: quarter.sharesOutstanding === null ? null : quarter.sharesOutstanding / 1_000_000,
    })),
  },
])
interface WaterfallLeg {
  key: string
  label: string
  cents: number | null
}

interface DilutionRow {
  label: string
  periodEnd: string
  periodStart: string
  fiscalYear: number | null
  fiscalPeriod: string | null
  calendarLabel: string
  shares: number | null
  qoqRatio: number | null
}

const waterfallQuarter = computed(() => quarters.value[quarters.value.length - 1] ?? null)

const waterfallLegs = computed<WaterfallLeg[]>(() => {
  const quarter = waterfallQuarter.value
  if (!quarter) {
    return []
  }
  return [
    { key: 'revenue', label: 'Revenue', cents: quarter.revenueCents },
    { key: 'operatingIncome', label: 'Operating income', cents: quarter.operatingIncomeCents },
    { key: 'operatingCashFlow', label: 'Operating cash flow', cents: quarter.operatingCashFlowCents },
    { key: 'capex', label: 'Capex', cents: quarter.capexCents },
    { key: 'freeCashFlow', label: 'Free cash flow', cents: quarter.freeCashFlowCents },
  ]
})

const waterfallScale = computed(() => {
  let max = 0
  for (const leg of waterfallLegs.value) {
    if (leg.cents !== null) {
      max = Math.max(max, Math.abs(leg.cents))
    }
  }
  return max
})

function waterfallWidth(cents: number | null): number {
  if (cents === null || waterfallScale.value <= 0) {
    return 0
  }
  return (Math.abs(cents) / waterfallScale.value) * 100
}

function waterfallColor(cents: number | null): string {
  return cents !== null && cents < 0 ? 'var(--chart-5)' : 'var(--chart-2)'
}

interface TrendPoint {
  label: string
  value: number | null
}

interface TrendEntry {
  key: string
  label: string
  color: string
  points: TrendPoint[]
}

interface TanstackTrendInput {
  rows: Array<{ label: string, series: string, value: number }>
  labels: string[]
  seriesLabels: string[]
  seriesColors: string[]
  yMin: number
  yMax: number
}

const TANSTACK_FALLBACK_COLORS = ['#93c5fd', '#1d4ed8', '#0f172a', '#0d9488', '#c2410c']

function toTanstackTrend(entries: TrendEntry[]): TanstackTrendInput {
  const rows: Array<{ label: string, series: string, value: number }> = []
  for (const entry of entries) {
    for (const point of entry.points) {
      if (point.value === null || !Number.isFinite(point.value)) {
        continue
      }
      rows.push({ label: point.label, series: entry.label, value: point.value })
    }
  }
  const seen = new Set<string>()
  const labels: string[] = []
  for (const row of rows) {
    if (!seen.has(row.label)) {
      seen.add(row.label)
      labels.push(row.label)
    }
  }
  const active = entries.filter((entry) =>
    entry.points.some((point) => point.value !== null && Number.isFinite(point.value)),
  )
  let yMin = 0
  let yMax = 0
  for (const row of rows) {
    yMin = Math.min(yMin, row.value)
    yMax = Math.max(yMax, row.value)
  }
  if (yMin === yMax) {
    yMax = yMin + 1
  }
  return {
    rows,
    labels,
    seriesLabels: active.map((entry) => entry.label),
    seriesColors: active.map((entry, index) =>
      entry.color.startsWith('var(')
        ? TANSTACK_FALLBACK_COLORS[index % TANSTACK_FALLBACK_COLORS.length]!
        : entry.color,
    ),
    yMin,
    yMax,
  }
}

const dilutionEntries = computed<TrendEntry[]>(() => [
  {
    key: 'shares',
    label: 'Shares outstanding (M)',
    color: 'var(--chart-2)',
    points: quarters.value.map((quarter) => ({
      label: quarter.label,
      value: quarter.sharesOutstanding === null ? null : quarter.sharesOutstanding / 1_000_000,
    })),
  },
])

const dilutionTrend = computed(() => toTanstackTrend(dilutionEntries.value))

const dilutionPointCount = computed(() =>
  quarters.value.filter((quarter) => quarter.sharesOutstanding !== null).length,
)

const hasDilutionChart = computed(
  () => dilutionPointCount.value >= 2 && dilutionTrend.value.rows.length > 0,
)

const dilutionRows = computed<DilutionRow[]>(() =>
  quarters.value.map((quarter, index) => {
    const previous = index > 0 ? quarters.value[index - 1]?.sharesOutstanding ?? null : null
    const current = quarter.sharesOutstanding
    return {
      label: quarter.label,
      periodEnd: quarter.periodEnd,
      periodStart: quarter.periodStart,
      fiscalYear: quarter.fiscalYear,
      fiscalPeriod: quarter.fiscalPeriod,
      calendarLabel: quarter.calendarLabel,
      shares: current,
      qoqRatio: current !== null && previous !== null && previous !== 0
        ? (current - previous) / previous
        : null,
    }
  }),
)

function attendancePerScreen(attendance: number | null, screens: number | null): number | null {
  if (attendance === null || screens === null || screens === 0) {
    return null
  }
  return attendance / screens
}

function formatPerScreen(attendance: number | null, screens: number | null): string {
  const perScreen = attendancePerScreen(attendance, screens)
  if (perScreen === null) {
    return '—'
  }
  return formatCount(Math.round(perScreen))
}

const footprintQuarters = computed(() => quarters.value.slice(-8))

const footprintScaleEntries = computed<TrendEntry[]>(() => [
  {
    key: 'theatres',
    label: 'Theatres',
    color: 'var(--chart-2)',
    points: footprintQuarters.value.map((quarter) => ({
      label: quarter.label,
      value: quarter.theatreCount,
    })),
  },
  {
    key: 'screens',
    label: 'Screens',
    color: 'var(--chart-4)',
    points: footprintQuarters.value.map((quarter) => ({
      label: quarter.label,
      value: quarter.screenCount,
    })),
  },
])

const footprintScaleTrend = computed(() => toTanstackTrend(footprintScaleEntries.value))

const efficiencyEntries = computed<TrendEntry[]>(() => [
  {
    key: 'perScreen',
    label: 'Attendance / screen',
    color: 'var(--chart-3)',
    points: footprintQuarters.value.map((quarter) => ({
      label: quarter.label,
      value: attendancePerScreen(quarter.attendanceCount, quarter.screenCount),
    })),
  },
])

const efficiencyTrend = computed(() => toTanstackTrend(efficiencyEntries.value))

const hasFootprint = computed(() =>
  footprintQuarters.value.some(
    (quarter) =>
      quarter.theatreCount !== null || quarter.screenCount !== null || quarter.attendanceCount !== null,
  ),
)

function hasSeries(
  series: Array<{ points: Array<{ value: number | null }> }>,
): boolean {
  return series.some((entry) => entry.points.some((point) => point.value !== null))
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1.5">
        <h1 class="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {{ detail?.name ?? ticker }}
        </h1>
        <p class="max-w-2xl text-sm text-muted-foreground">
          Operating history, profitability, cash flow, and capital structure from SEC filings.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <NuxtLink
          v-for="companyTicker in companyTickers"
          :key="companyTicker"
          :to="`/companies/${companyTicker}`"
        >
          <Badge :variant="companyTicker === ticker ? 'default' : 'outline'">
            {{ companyTicker }}
          </Badge>
        </NuxtLink>
      </div>
    </div>

    <div v-if="loading" class="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
      <Skeleton v-for="index in 4" :key="index" class="h-28" />
    </div>

    <template v-else-if="latest">
      <p class="text-xs text-muted-foreground" :title="formatQuarterPeriodRange(latestRange)">
        {{ formatQuarterIdentity(latestIdentity) }} · {{ formatQuarterPeriodRange(latestRange) }} · reported {{ latest.latestQuarterEnd ?? '—' }}
      </p>
      <div class="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <DashboardKpiCard
          label="Revenue"
          :value="formatUsdMillions(latest.revenueCents)"
          :delta="latest.revenueYoyRatio"
        />
        <DashboardKpiCard
          label="Attendance"
          :value="formatMillionsCount(latest.attendanceCount)"
          :delta="latest.attendanceYoyRatio"
          :period="latest.latestQuarterLabel"
        />
        <DashboardKpiCard
          label="Revenue / patron"
          :value="formatUsdExact(latest.revenuePerPatronCents)"
          :delta="latest.revenuePerPatronYoyRatio"
          :period="latest.latestQuarterLabel"
        />
        <DashboardKpiCard
          label="Free cash flow"
          :value="formatUsdMillions(latest.freeCashFlowCents)"
          :period="latest.latestQuarterLabel"
        />
      </div>

      <Card v-if="isAmc">
        <CardHeader>
          <CardTitle>AMC capital-structure focus</CardTitle>
          <CardDescription>
            Equity analysis for AMC depends as much on liquidity, interest burden, and dilution as on theater operations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p class="text-muted-foreground">Cash</p>
              <p class="text-lg font-semibold tabular-nums">
                {{ formatUsdMillions(latest.cashCents) }}
              </p>
            </div>
            <div>
              <p class="text-muted-foreground">Long-term debt</p>
              <p class="text-lg font-semibold tabular-nums">
                {{ formatUsdMillions(latest.longTermDebtCents) }}
              </p>
            </div>
            <div>
              <p class="text-muted-foreground">Interest expense</p>
              <p class="text-lg font-semibold tabular-nums">
                {{ formatUsdMillions(latest.interestExpenseCents) }}
              </p>
            </div>
            <div>
              <p class="text-muted-foreground">Shares outstanding</p>
              <p class="text-lg font-semibold tabular-nums">
                {{ formatShares(latest.sharesOutstanding) }}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div class="grid gap-4 xl:grid-cols-2">
        <DashboardSectionCard
          title="Operating trends"
          description="Attendance and revenue per patron over recent quarters."
        >
          <DashboardTrendLines
            v-if="hasSeries(operatingLines)"
            :series="operatingLines"
          />
          <p v-else class="text-sm text-muted-foreground">
            Not enough operating history to chart yet.
          </p>
        </DashboardSectionCard>

        <DashboardSectionCard
          title="Profitability"
          description="Revenue translating into operating and net income."
        >
          <DashboardTrendLines
            v-if="hasSeries(profitLines)"
            :series="profitLines"
            :format-value="(value: number) => `$${value.toFixed(0)}M`"
          />
          <p v-else class="text-sm text-muted-foreground">
            Not enough profitability history to chart yet.
          </p>
        </DashboardSectionCard>

        <DashboardSectionCard
          title="Cash flow"
          description="Operating cash flow, capital expenditures, and free cash flow."
        >
          <DashboardTrendLines
            v-if="hasSeries(cashLines)"
            :series="cashLines"
            :format-value="(value: number) => `$${value.toFixed(0)}M`"
          />
          <p v-else class="text-sm text-muted-foreground">
            Not enough cash-flow history to chart yet.
          </p>
        </DashboardSectionCard>

        <DashboardSectionCard
          title="Capital structure"
          description="Cash, debt, interest expense, and share count over time."
        >
          <DashboardTrendLines
            v-if="hasSeries(capitalLines)"
            :series="capitalLines"
          />
          <p v-else class="text-sm text-muted-foreground">
            Not enough capital-structure history to chart yet.
          </p>
        </DashboardSectionCard>
      </div>
      <div class="grid gap-4 xl:grid-cols-2">
        <DashboardSectionCard
          title="Cash waterfall"
          :description="`Latest quarter${waterfallQuarter ? ` (${waterfallQuarter.label})` : ''}: revenue flowing through to free cash flow.`"
        >
          <div v-if="waterfallLegs.length > 0" class="space-y-2.5">
            <div v-for="leg in waterfallLegs" :key="leg.key" class="space-y-1">
              <div class="flex items-baseline justify-between gap-3 text-sm">
                <span class="text-muted-foreground">{{ leg.label }}</span>
                <span class="font-semibold tabular-nums">{{ formatUsdMillions(leg.cents) }}</span>
              </div>
              <div class="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  class="h-full rounded-full"
                  :style="{ width: `${waterfallWidth(leg.cents)}%`, backgroundColor: waterfallColor(leg.cents) }"
                />
              </div>
            </div>
            <p class="pt-1 text-xs text-muted-foreground">
              FCF = operating cash flow − capex. “—” means the leg was undisclosed for this quarter.
            </p>
          </div>
          <p v-else class="text-sm text-muted-foreground">
            No cash-flow disclosure for the latest quarter.
          </p>
        </DashboardSectionCard>

        <DashboardSectionCard
          title="Dilution history"
          description="Shares outstanding and quarter-over-quarter change."
        >
          <div class="space-y-4">
            <DashboardTanstackTrendChart
              v-if="hasDilutionChart"
              :rows="dilutionTrend.rows"
              :labels="dilutionTrend.labels"
              :series-labels="dilutionTrend.seriesLabels"
              :series-colors="dilutionTrend.seriesColors"
              :y-min="dilutionTrend.yMin"
              :y-max="dilutionTrend.yMax"
              :format-value="(value: number) => `${value.toFixed(0)}M`"
              :height="260"
              chart-aria-label="Shares outstanding trend"
            />
            <p v-else class="text-sm text-muted-foreground">
              Insufficient disclosure to chart dilution.
            </p>
            <div class="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quarter</TableHead>
                    <TableHead>Shares</TableHead>
                    <TableHead>QoQ change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="row in [...dilutionRows].reverse()" :key="row.label">
                    <TableCell :title="formatQuarterPeriodRange(row)">{{ footprintIdentity(row) }}</TableCell>
                    <TableCell class="tabular-nums">
                      {{ formatShares(row.shares) }}
                    </TableCell>
                    <TableCell class="tabular-nums">
                      {{ formatSignedRatio(row.qoqRatio) }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </DashboardSectionCard>
      </div>

      <DashboardSectionCard
        title="Footprint efficiency"
        description="Theatre footprint alongside attendance per screen for the last 8 quarters."
      >
        <div v-if="hasFootprint" class="space-y-6">
          <div class="grid gap-4 xl:grid-cols-2">
            <div>
              <p class="mb-2 text-sm font-medium">Footprint scale</p>
              <DashboardTanstackTrendChart
                v-if="footprintScaleTrend.rows.length > 0"
                :rows="footprintScaleTrend.rows"
                :labels="footprintScaleTrend.labels"
                :series-labels="footprintScaleTrend.seriesLabels"
                :series-colors="footprintScaleTrend.seriesColors"
                :y-min="footprintScaleTrend.yMin"
                :y-max="footprintScaleTrend.yMax"
                :format-value="(value: number) => value.toFixed(0)"
                :height="260"
                chart-aria-label="Theatre and screen footprint trend"
              />
              <p v-else class="text-sm text-muted-foreground">
                No theatre or screen disclosure in this window.
              </p>
            </div>
            <div>
              <p class="mb-2 text-sm font-medium">Attendance per screen</p>
              <DashboardTanstackTrendChart
                v-if="efficiencyTrend.rows.length > 0"
                :rows="efficiencyTrend.rows"
                :labels="efficiencyTrend.labels"
                :series-labels="efficiencyTrend.seriesLabels"
                :series-colors="efficiencyTrend.seriesColors"
                :y-min="efficiencyTrend.yMin"
                :y-max="efficiencyTrend.yMax"
                :format-value="(value: number) => value.toFixed(0)"
                :height="260"
                chart-aria-label="Attendance per screen trend"
              />
              <p v-else class="text-sm text-muted-foreground">
                No attendance-per-screen disclosure in this window.
              </p>
            </div>
          </div>
          <div class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quarter</TableHead>
                  <TableHead>Theatres</TableHead>
                  <TableHead>Screens</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Per screen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="quarter in [...footprintQuarters].reverse()" :key="quarter.periodEnd">
                  <TableCell :title="formatQuarterPeriodRange(quarter)">{{ footprintIdentity(quarter) }}</TableCell>
                  <TableCell class="tabular-nums">
                    {{ formatCount(quarter.theatreCount) }}
                  </TableCell>
                  <TableCell class="tabular-nums">
                    {{ formatCount(quarter.screenCount) }}
                  </TableCell>
                  <TableCell class="tabular-nums">
                    {{ formatMillionsCount(quarter.attendanceCount) }}
                  </TableCell>
                  <TableCell class="tabular-nums">
                    {{ formatPerScreen(quarter.attendanceCount, quarter.screenCount) }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
        <p v-else class="text-sm text-muted-foreground">
          No footprint disclosure in the last 8 quarters.
        </p>
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Quarterly history"
        description="Reported and derived metrics for recent quarters."
      >
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quarter</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Avg ticket</TableHead>
                <TableHead>F&B/patron</TableHead>
                <TableHead>Rev/patron</TableHead>
                <TableHead>Op income</TableHead>
                <TableHead>Net income</TableHead>
                <TableHead>FCF</TableHead>
                <TableHead>Cash</TableHead>
                <TableHead>Debt</TableHead>
                <TableHead>Shares</TableHead>
                <TableHead>Theatres · Screens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="quarter in [...quarters].reverse()" :key="quarter.periodEnd">
                <TableCell :title="`${formatQuarterPeriodRange(quarter)} · ${formatQuarterIdentity(quarter)}`">{{ footprintIdentity(quarter) }}</TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(quarter.revenueCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatMillionsCount(quarter.attendanceCount) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdExact(quarter.averageTicketPriceCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdExact(quarter.foodBeveragePerPatronCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdExact(quarter.revenuePerPatronCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(quarter.operatingIncomeCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(quarter.netIncomeCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(quarter.freeCashFlowCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(quarter.cashCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(quarter.longTermDebtCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatShares(quarter.sharesOutstanding) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatTheatresScreens(quarter.theatreCount, quarter.screenCount) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DashboardSectionCard>
    </template>

    <div v-else class="text-sm text-muted-foreground">
      No company data found for {{ ticker }}.
    </div>
  </div>
</template>
