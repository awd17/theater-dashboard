<script setup lang="ts">
import {
  formatCount,
  formatMillionsCount,
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

const perPatronBars = computed(() =>
  rows.value.map((operator) => ({
    label: operator.ticker,
    values: [
      {
        key: 'avgTicket',
        label: 'Avg ticket',
        value: (operator.averageTicketPriceCents ?? 0) / 100,
        color: 'var(--chart-2)',
      },
      {
        key: 'fb',
        label: 'F&B / patron',
        value: (operator.foodBeveragePerPatronCents ?? 0) / 100,
        color: 'var(--chart-4)',
      },
      {
        key: 'rev',
        label: 'Revenue / patron',
        value: (operator.revenuePerPatronCents ?? 0) / 100,
        color: 'var(--chart-3)',
      },
    ],
  })),
)

const quadrantPoints = computed(() =>
  rows.value
    .filter((operator) =>
      operator.attendanceYoyRatio !== null && operator.revenuePerPatronYoyRatio !== null,
    )
    .map((operator) => ({
      ticker: operator.ticker,
      x: (operator.revenuePerPatronYoyRatio ?? 0) * 100,
      y: (operator.attendanceYoyRatio ?? 0) * 100,
    })),
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

function netDebt(operator: typeof rows.value[number]): number | null {
  if (operator.longTermDebtCents === null || operator.cashCents === null) {
    return null
  }
  return operator.longTermDebtCents - operator.cashCents
}

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
              <Badge variant="outline">
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
              </span>
            </div>
            <div class="flex items-baseline justify-between gap-2">
              <span class="text-muted-foreground">Rev / patron</span>
              <span class="font-medium tabular-nums">
                {{ formatUsdExact(operator.revenuePerPatronCents) }}
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
            v-if="perPatronBars.some((row) => row.values.some((value) => value.value > 0))"
            :items="perPatronBars"
            :format-value="(value: number) => `$${value.toFixed(2)}`"
          />
          <p v-else class="text-sm text-muted-foreground">
            Per-patron metrics require matched attendance and revenue periods.
          </p>
        </DashboardSectionCard>

        <DashboardSectionCard
          title="Volume vs monetization"
          description="Attendance growth versus revenue-per-patron growth. Upper-right is strong on both."
        >
          <div v-if="quadrantPoints.length > 0" class="space-y-3">
            <svg viewBox="0 0 320 240" class="h-[240px] w-full">
              <line x1="40" y1="120" x2="300" y2="120" class="stroke-border" />
              <line x1="170" y1="20" x2="170" y2="220" class="stroke-border" />
              <text x="170" y="236" text-anchor="middle" class="fill-muted-foreground text-[10px]">
                Revenue / patron growth %
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
                class="fill-foreground"
              />
              <text
                v-for="point in quadrantPoints"
                :key="`${point.ticker}-label`"
                :x="170 + (point.x / quadrantExtent) * 130 + 10"
                :y="120 - (point.y / quadrantExtent) * 100 + 3"
                class="fill-foreground text-[10px] font-medium"
              >
                {{ point.ticker }}
              </text>
            </svg>
            <div class="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span v-for="point in quadrantPoints" :key="point.ticker">
                {{ point.ticker }}: attendance {{ point.y.toFixed(1) }}%, rev/patron {{ point.x.toFixed(1) }}%
              </span>
            </div>
          </div>
          <p v-else class="text-sm text-muted-foreground">
            Need year-over-year attendance and revenue-per-patron for the quadrant.
          </p>
        </DashboardSectionCard>
      </div>

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
                <TableCell>{{ operator.latestQuarterLabel ?? '—' }}</TableCell>
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
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatTheatresScreens(operator.theatreCount, operator.screenCount) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatCount(operator.attendancePerScreen) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdExact(operator.averageTicketPriceCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdExact(operator.foodBeveragePerPatronCents) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  {{ formatUsdExact(operator.revenuePerPatronCents) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
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
                  {{ formatUsdMillions(netDebt(operator)) }}
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
          theatre/screen counts are parsed from 10-Q tables. AMC screens are period-end counts while
          Cinemark reports a quarterly average. Missing cells mean the company did not report the value.
        </p>
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
