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

const orpc = useORPC()

const { data: operators, status } = await useRpcData(
  'operators-snapshot',
  () => orpc.operators.snapshot(),
)

const { data: history } = await useRpcData(
  'operators-history',
  () => orpc.operators.history(),
)

useHead({ title: 'Operators' })

const loading = computed(() => status.value === 'pending')
const rows = computed(() => operators.value?.operators ?? [])

function operatorIdentity(operator: {
  latestQuarterLabel: string | null
  latestQuarterEnd: string | null
  latestFiscalYear: number | null
  latestFiscalPeriod: string | null
  latestCalendarLabel: string | null
}): string {
  return formatQuarterIdentity({
    label: operator.latestQuarterLabel,
    periodEnd: operator.latestQuarterEnd,
    fiscalYear: operator.latestFiscalYear,
    fiscalPeriod: operator.latestFiscalPeriod,
    calendarLabel: operator.latestCalendarLabel,
  })
}

function operatorRange(operator: {
  latestPeriodStart: string | null
  latestQuarterEnd: string | null
}): string {
  return formatQuarterPeriodRange({ periodStart: operator.latestPeriodStart, periodEnd: operator.latestQuarterEnd })
}

const perPatronBars = computed(() =>
  rows.value.map((operator) => ({
    label: operator.ticker,
    values: [
      operator.averageTicketPriceCents === null ? null : {
        key: 'avgTicket',
        label: 'Avg ticket',
        value: operator.averageTicketPriceCents / 100,
        color: 'var(--chart-2)',
      },
      operator.foodBeveragePerPatronCents === null ? null : {
        key: 'fb',
        label: 'F&B / patron',
        value: operator.foodBeveragePerPatronCents / 100,
        color: 'var(--chart-4)',
      },
      operator.revenuePerPatronCents === null ? null : {
        key: 'rev',
        label: 'Revenue / patron',
        value: operator.revenuePerPatronCents / 100,
        color: 'var(--chart-3)',
      },
    ].filter((value) => value !== null),
  })),
)

const missingPerPatronOperators = computed(() =>
  rows.value
    .filter((operator) => operator.revenuePerPatronCents === null)
    .map((operator) => operator.ticker),
)

const operatorColors: Record<string, string> = {
  AMC: '#0f172a',
  CNK: '#1d4ed8',
  MCS: '#93c5fd',
}

const quadrantPoints = computed(() =>
  rows.value.flatMap((operator) => {
    if (
      operator.attendanceYoyRatio === null
      || operator.revenuePerPatronYoyRatio === null
      || operator.attendanceYoyQuality === null
      || operator.revenuePerPatronYoyQuality === null
    ) {
      return []
    }
    return [{
      ticker: operator.ticker,
      x: operator.revenuePerPatronYoyRatio * 100,
      y: operator.attendanceYoyRatio * 100,
      attendanceQuality: operator.attendanceYoyQuality,
      monetizationQuality: operator.revenuePerPatronYoyQuality,
      color: operatorColors[operator.ticker] ?? 'var(--foreground)',
    }]
  }),
)

const qualityLabels = {
  reported: 'reported',
  derived: 'derived',
  estimated: 'estimated',
} as const

const quadrantPlot = ref<HTMLElement | null>(null)
const quadrantTooltip = ref<{
  point: (typeof quadrantPoints.value)[number]
  left: number
  top: number
} | null>(null)

function showQuadrantTooltip(
  event: MouseEvent | FocusEvent,
  point: (typeof quadrantPoints.value)[number],
): void {
  const target = event.currentTarget
  const plot = quadrantPlot.value
  if (!(target instanceof SVGCircleElement) || !plot) {
    return
  }

  const targetBounds = target.getBoundingClientRect()
  const plotBounds = plot.getBoundingClientRect()
  quadrantTooltip.value = {
    point,
    left: targetBounds.left - plotBounds.left + targetBounds.width / 2,
    top: targetBounds.top - plotBounds.top - 8,
  }
}

function hideQuadrantTooltip(): void {
  quadrantTooltip.value = null
}

const perScreenLines = computed(() =>
  (history.value?.operators ?? []).map((operator, index) => ({
    key: operator.ticker,
    label: operator.ticker,
    color: ['var(--chart-2)', 'var(--chart-4)', 'var(--chart-5)'][index % 3]!,
    points: operator.quarters.map((quarter) => ({
      label: quarter.label,
      value: quarter.attendancePerScreen,
    })),
  })),
)

function formatCoverage(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) {
    return '—'
  }
  return `${ratio.toFixed(1)}×`
}

const hasPerScreenHistory = computed(() =>
  perScreenLines.value.some((line) => line.points.some((point) => point.value !== null)),
)

const revenueTrend = computed(() => {
  const historyRows = history.value?.operators ?? []
  if (historyRows.length === 0) {
    return null
  }

  const labels = [...new Set(
    historyRows.flatMap((operator) => operator.quarters.map((quarter) => quarter.label)),
  )]
  const labelOrder = new Map(
    historyRows.flatMap((operator) =>
      operator.quarters.map((quarter) => [quarter.label, quarter.periodEnd] as const),
    ),
  )
  labels.sort((a, b) => (labelOrder.get(b) ?? '').localeCompare(labelOrder.get(a) ?? ''))

  return {
    tickers: historyRows.map((operator) => operator.ticker),
    rows: labels.slice(0, 8).map((label) => ({
      label,
      cells: historyRows.map((operator) =>
        operator.quarters.find((quarter) => quarter.label === label)?.revenueCents ?? null,
      ),
    })),
  }
})

const quadrantExtent = 20
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-1.5">
      <h1 class="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        Operator Comparison
      </h1>
      <p class="max-w-2xl text-sm text-muted-foreground">
        Operating performance, per-patron monetization, and balance-sheet risk across AMC, Cinemark, and Marcus.
      </p>
    </div>

    <div v-if="loading" class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4">
      <Skeleton v-for="index in 3" :key="index" class="h-40" />
    </div>

    <div v-else-if="rows.length === 0" class="text-sm text-muted-foreground">
      No operator data ingested yet.
    </div>

    <template v-else>
      <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4">
        <Card v-for="operator in rows" :key="operator.ticker">
          <CardHeader>
            <div class="flex items-start justify-between gap-2">
              <div>
                <CardTitle>{{ operator.ticker }}</CardTitle>
                <CardDescription>{{ operator.name }}</CardDescription>
              </div>
              <Badge variant="outline" :title="`${operatorRange(operator)} · reported ${operator.latestQuarterEnd ?? '—'}`">
                {{ operator.latestQuarterLabel ?? '—' }}
              </Badge>
            </div>
          </CardHeader>
          <CardContent class="space-y-3 text-sm">
            <div class="flex items-baseline justify-between gap-2">
              <span class="text-muted-foreground">Revenue</span>
              <span class="font-medium tabular-nums">
                {{ formatUsdMillions(operator.revenueCents) }}
                <span class="ml-1 text-xs font-normal text-muted-foreground">
                  {{ formatSignedRatio(operator.revenueYoyRatio) }}
                </span>
              </span>
            </div>
            <div class="flex items-baseline justify-between gap-2">
              <span class="text-muted-foreground">Attendance</span>
              <span class="font-medium tabular-nums">
                {{ formatMillionsCount(operator.attendanceCount) }}
                <span class="ml-1 text-xs font-normal text-muted-foreground">
                  {{ formatSignedRatio(operator.attendanceYoyRatio) }}
                </span>
                <Badge v-if="operator.attendanceYoyQuality" variant="outline" class="ml-1 text-[10px]">
                  {{ qualityLabels[operator.attendanceYoyQuality] }}
                </Badge>
              </span>
            </div>
            <div class="flex items-baseline justify-between gap-2">
              <span class="text-muted-foreground">Rev / patron</span>
              <span class="font-medium tabular-nums">
                {{ formatUsdExact(operator.revenuePerPatronCents) }}
                <Badge v-if="operator.perPatronQuality" variant="outline" class="ml-1 text-[10px]">
                  {{ qualityLabels[operator.perPatronQuality] }}
                </Badge>
              </span>
            </div>
            <div class="flex items-baseline justify-between gap-2">
              <span class="text-muted-foreground">Net income</span>
              <span class="font-medium tabular-nums">
                {{ formatUsdMillions(operator.netIncomeCents) }}
              </span>
            </div>
            <div class="pt-1">
              <NuxtLink
                :to="`/companies/${operator.ticker}`"
                class="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Company detail
              </NuxtLink>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-4 xl:grid-cols-2">
        <DashboardSectionCard
          title="Per-patron economics"
          description="Average ticket price, food and beverage per patron, and total revenue per patron."
        >
          <DashboardGroupedBars
            v-if="perPatronBars.some((row) => row.values.length > 0)"
            :items="perPatronBars"
            :format-value="(value: number) => `$${value.toFixed(2)}`"
          />
          <p v-else class="text-sm text-muted-foreground">
            Per-patron metrics require matched attendance and revenue periods.
          </p>
          <p class="mt-3 text-xs text-muted-foreground">
            Derived from reported revenue and attendance.
            <template v-if="missingPerPatronOperators.length > 0">
              {{ missingPerPatronOperators.join(', ') }} omitted because absolute attendance is not reported.
            </template>
          </p>
        </DashboardSectionCard>

        <DashboardSectionCard
          title="Volume vs monetization"
          description="Attendance growth versus revenue-per-patron growth. Upper-right is strong on both."
        >
          <div v-if="quadrantPoints.length > 0" class="space-y-3">
            <div ref="quadrantPlot" class="relative">
              <svg viewBox="0 0 320 240" class="h-[240px] w-full">
                <line x1="40" y1="120" x2="300" y2="120" class="stroke-border" />
                <line x1="170" y1="20" x2="170" y2="220" class="stroke-border" />
                <text x="170" y="236" text-anchor="middle" class="fill-muted-foreground text-[10px]">
                  Monetization growth %
                </text>
                <text
                  x="14"
                  y="120"
                  text-anchor="middle"
                  transform="rotate(-90 14 120)"
                  class="fill-muted-foreground text-[10px]"
                >
                  Attendance growth %
                </text>
                <circle
                  v-for="point in quadrantPoints"
                  :key="point.ticker"
                  :cx="170 + (point.x / quadrantExtent) * 130"
                  :cy="120 - (point.y / quadrantExtent) * 100"
                  r="7"
                  tabindex="0"
                  role="img"
                  class="outline-none"
                  :aria-label="`${point.ticker}: attendance ${point.y.toFixed(1)} percent, monetization ${point.x.toFixed(1)} percent`"
                  :style="{ fill: point.color }"
                  @mouseenter="showQuadrantTooltip($event, point)"
                  @mouseleave="hideQuadrantTooltip"
                  @focus="showQuadrantTooltip($event, point)"
                  @blur="hideQuadrantTooltip"
                />
                <text
                  v-for="(point, index) in quadrantPoints"
                  :key="`${point.ticker}-label`"
                  :x="170 + (point.x / quadrantExtent) * 130 + 10"
                  :y="120 - (point.y / quadrantExtent) * 100 + (index % 2 === 0 ? -8 : 14)"
                  class="pointer-events-none text-[10px] font-medium"
                  :style="{ fill: point.color }"
                >
                  {{ point.ticker }}
                </text>
              </svg>
              <div
                v-if="quadrantTooltip"
                class="pointer-events-none absolute z-10 grid min-w-52 -translate-x-1/2 -translate-y-full gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl"
                :style="{ left: `${quadrantTooltip.left}px`, top: `${quadrantTooltip.top}px` }"
                aria-hidden="true"
              >
                <div class="flex items-center gap-1.5 font-medium">
                  <span
                    class="size-2 rounded-full"
                    :style="{ backgroundColor: quadrantTooltip.point.color }"
                  />
                  {{ quadrantTooltip.point.ticker }}
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span class="text-muted-foreground">Attendance growth</span>
                  <span class="font-mono font-medium tabular-nums">
                    {{ quadrantTooltip.point.y.toFixed(1) }}%
                  </span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span class="text-muted-foreground">Monetization growth</span>
                  <span class="font-mono font-medium tabular-nums">
                    {{ quadrantTooltip.point.x.toFixed(1) }}%
                  </span>
                </div>
                <div class="text-muted-foreground">
                  Attendance {{ qualityLabels[quadrantTooltip.point.attendanceQuality] }}
                  · monetization {{ qualityLabels[quadrantTooltip.point.monetizationQuality] }}
                </div>
              </div>
            </div>
            <p
              v-if="quadrantPoints.some((point) => point.monetizationQuality === 'estimated')"
              class="text-xs text-muted-foreground"
            >
              Estimated monetization uses reported ticket-price and concession-per-person growth,
              weighted by the prior-year revenue mix. It excludes other theatre revenue.
            </p>
          </div>
          <p v-else class="text-sm text-muted-foreground">
            Need year-over-year attendance and revenue-per-patron for the quadrant.
          </p>
        </DashboardSectionCard>
      </div>
      <p class="text-xs text-muted-foreground">
        Quality badges: reported values come straight from filings, derived values combine reported inputs,
        estimated values use a modeled proxy.
      </p>
      <DashboardSectionCard
        title="Operations scorecard"
        description="Attendance, footprint, and admissions/F&B split from the latest reported quarter."
      >
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Quarter</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>YoY</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Theatres · Screens</TableHead>
                <TableHead>Att/screen</TableHead>
                <TableHead>Avg ticket</TableHead>
                <TableHead>F&B/patron</TableHead>
                <TableHead>Rev/patron</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="operator in rows" :key="operator.ticker">
                <TableCell class="font-medium">
                  <NuxtLink
                    :to="`/companies/${operator.ticker}`"
                    class="underline-offset-4 hover:underline"
                  >
                    {{ operator.ticker }}
                  </NuxtLink>
                </TableCell>
                <TableCell :title="`${operatorRange(operator)} · reported ${operator.latestQuarterEnd ?? '—'}`">{{ operatorIdentity(operator) }}</TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(operator.revenueCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatSignedRatio(operator.revenueYoyRatio) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatMillionsCount(operator.attendanceCount) }}
                  <template v-if="operator.attendanceYoyRatio !== null">
                    · {{ formatSignedRatio(operator.attendanceYoyRatio) }}
                  </template>
                  <Badge v-if="operator.attendanceYoyQuality" variant="outline" class="ml-1 text-[10px]">
                    {{ qualityLabels[operator.attendanceYoyQuality] }}
                  </Badge>
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatTheatresScreens(operator.theatreCount, operator.screenCount) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatCount(operator.attendancePerScreen) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdExact(operator.averageTicketPriceCents) }}
                  <Badge v-if="operator.perPatronQuality" variant="outline" class="ml-1 text-[10px]">
                    {{ qualityLabels[operator.perPatronQuality] }}
                  </Badge>
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdExact(operator.foodBeveragePerPatronCents) }}
                  <Badge v-if="operator.perPatronQuality" variant="outline" class="ml-1 text-[10px]">
                    {{ qualityLabels[operator.perPatronQuality] }}
                  </Badge>
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdExact(operator.revenuePerPatronCents) }}
                  <Badge v-if="operator.perPatronQuality" variant="outline" class="ml-1 text-[10px]">
                    {{ qualityLabels[operator.perPatronQuality] }}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p class="mt-3 text-xs text-muted-foreground">
          Reported values come straight from filings, derived values combine reported inputs,
          estimated values use a modeled proxy.
        </p>
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Balance sheet and cash generation"
        description="Liquidity, leverage, interest burden, and free cash flow. Reporting definitions differ by company."
      >
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Cash</TableHead>
                <TableHead>LT debt</TableHead>
                <TableHead>Net debt</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Op leases</TableHead>
                <TableHead>Op cash flow</TableHead>
                <TableHead>Capex</TableHead>
                <TableHead>FCF</TableHead>
                <TableHead>Shares</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="operator in rows" :key="operator.ticker">
                <TableCell class="font-medium">
                  {{ operator.ticker }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(operator.cashCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(operator.longTermDebtCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(operator.netDebtCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(operator.interestExpenseCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(operator.operatingLeaseCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(operator.operatingCashFlowCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(operator.capexCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(operator.freeCashFlowCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatShares(operator.sharesOutstanding) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p class="mt-4 text-xs text-muted-foreground">
          Financials come from standardized XBRL company facts. Attendance, admissions/F&B split, and
          theatre/screen counts are supplemented from 10-Q tables when the SEC Company Facts feed lags.
          AMC and Marcus screens are period-end counts while Cinemark reports a quarterly average.
          Missing cells mean no comparable current-period public value was available.
        </p>
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Lease-adjusted leverage"
        description="Net debt, lease-adjusted net debt, and interest coverage from the latest reported quarter."
      >
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Net debt</TableHead>
                <TableHead>Lease-adjusted net debt</TableHead>
                <TableHead>Interest coverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="operator in rows" :key="operator.ticker">
                <TableCell class="font-medium">
                  {{ operator.ticker }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(operator.netDebtCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdMillions(operator.leaseAdjustedNetDebtCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatCoverage(operator.interestCoverageRatio) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p class="mt-3 text-xs text-muted-foreground">
          Lease-adjusted net debt adds operating lease liabilities to long-term debt minus cash.
          Missing values mean a required input was not filed for the latest quarter.
        </p>
      </DashboardSectionCard>

      <DashboardSectionCard
        v-if="hasPerScreenHistory"
        title="Attendance per screen trend"
        description="Attendance per screen over the last eight quarters."
      >
        <DashboardTrendLines :series="perScreenLines" :format-value="(value: number) => value.toFixed(0)" />
      </DashboardSectionCard>

      <DashboardSectionCard
        v-if="revenueTrend && revenueTrend.rows.length > 0"
        title="Quarterly revenue trend"
        description="Reported quarterly revenue by operator."
      >
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quarter</TableHead>
                <TableHead v-for="ticker in revenueTrend.tickers" :key="ticker">
                  {{ ticker }}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in revenueTrend.rows" :key="row.label">
                <TableCell>{{ row.label }}</TableCell>
                <TableCell
                  v-for="(cell, index) in row.cells"
                  :key="revenueTrend.tickers[index]"
                  class="tabular-nums"
                >
                  {{ formatUsdMillions(cell) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DashboardSectionCard>
    </template>
  </div>
</template>
