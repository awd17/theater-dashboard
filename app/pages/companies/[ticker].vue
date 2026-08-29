<script setup lang="ts">
import {
  formatMillionsCount,
  formatShares,
  formatTheatresScreens,
  formatUsdExact,
  formatUsdMillions,
} from '@/lib/format'

const route = useRoute()
const orpc = useORPC()

const ticker = computed(() => String(route.params.ticker ?? '').toUpperCase())

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

function hasSeries(
  series: Array<{ points: Array<{ value: number | null }> }>,
): boolean {
  return series.some((entry) => entry.points.some((point) => point.value !== null))
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ detail?.name ?? ticker }}
        </h1>
        <p class="text-sm text-muted-foreground">
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

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Skeleton v-for="index in 4" :key="index" class="h-28" />
    </div>

    <template v-else-if="latest">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard
          label="Revenue"
          :value="formatUsdMillions(latest.revenueCents)"
          :delta="latest.revenueYoyRatio"
          :period="latest.latestQuarterLabel"
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
                <TableCell>{{ quarter.label }}</TableCell>
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
