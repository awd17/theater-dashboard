<script setup lang="ts">
import {
  formatBillions,
  formatMillionsCount,
  formatRatio,
  formatSignedRatio,
  formatUsd,
  formatUsdCompact,
  formatUsdExact,
} from '@/lib/format'

const orpc = useORPC()

const recoveryBaseline = ref<'2019' | 'avg2017_2019'>('2019')

const { data: industry, status: industryStatus, refresh: refreshIndustry } = await useRpcData(
  () => `industry-snapshot-${recoveryBaseline.value}`,
  () => orpc.industry.snapshot({ baseline: recoveryBaseline.value }),
)

watch(recoveryBaseline, () => {
  void refreshIndustry()
})

const { data: trend, status: trendStatus } = await useRpcData(
  'industry-trend',
  () => orpc.industry.trend(),
)

const loading = computed(
  () => industryStatus.value === 'pending' || trendStatus.value === 'pending',
)

useHead({ title: 'Industry' })

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const yearColors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)']

const monthlyBars = computed(() => {
  const series = trend.value?.monthlyByYear ?? []
  if (series.length === 0) {
    return []
  }

  const years = series.map((entry) => entry.year)
  const byYear = new Map(
    series.map((entry) => [
      entry.year,
      new Map(entry.months.map((month) => [month.monthNumber, month.boxOfficeCents])),
    ]),
  )

  return Array.from({ length: 12 }, (_, index) => {
    const monthNumber = index + 1
    const values = years.map((year, yearIndex) => {
      const cents = byYear.get(year)?.get(monthNumber) ?? null
      return {
        key: String(year),
        label: String(year),
        value: cents === null ? null : cents / 100 / 1_000_000,
        color: yearColors[yearIndex % yearColors.length]!,
      }
    })
    return {
      label: monthLabels[index]!,
      values,
    }
  }).filter((item) => item.values.some((series) => series.value !== null && series.value > 0))
})

const cumulativeLines = computed(() => {
  const series = trend.value?.monthlyByYear ?? []
  return series.map((entry, yearIndex) => ({
    key: String(entry.year),
    label: String(entry.year),
    color: yearColors[yearIndex % yearColors.length]!,
    points: Array.from({ length: 12 }, (_, index) => {
      const monthNumber = index + 1
      const point = entry.cumulativeByMonth.find((month) => month.monthNumber === monthNumber)
      return {
        label: monthLabels[index]!,
        value: point ? point.cumulativeCents / 100 / 1_000_000_000 : null,
      }
    }).filter((_, index) =>
      series.some((year) =>
        year.months.some((month) => month.monthNumber === index + 1),
      ),
    ),
  }))
})

const marketBars = computed(() =>
  (industry.value?.marketYears ?? []).slice(-12).map((year) => ({
    label: `${year.periodLabel} cal`,
    values: [{
      key: 'boxOffice',
      label: 'Box office',
      value: year.boxOfficeCents === null ? null : year.boxOfficeCents / 100 / 1_000_000_000,
      color: 'var(--chart-2)',
    }],
  })),
)

const recentMarketYears = computed(() =>
  [...(industry.value?.marketYears ?? [])].slice(-12).reverse(),
)

const seasonality = computed(() => trend.value?.seasonality ?? null)

const heatmapMaxCents = computed(() => {
  let max = 0
  for (const row of seasonality.value?.months ?? []) {
    for (const value of Object.values(row.values)) {
      if (value !== null && value > max) {
        max = value
      }
    }
  }
  return max
})

function heatmapCellStyle(cents: number | null): string {
  if (cents === null || heatmapMaxCents.value === 0) {
    return 'background-color: transparent;'
  }
  const intensity = cents / heatmapMaxCents.value
  return `background-color: color-mix(in srgb, var(--chart-2) ${Math.round(intensity * 85)}%, transparent);`
}

const recoveryBaselineLabel = computed(() =>
  recoveryBaseline.value === '2019' ? '2019' : '2017–19 avg',
)

const recoveryExplainer = computed(() =>
  recoveryBaseline.value === '2019'
    ? 'Latest completed box-office year as a share of 2019, from The Numbers market totals.'
    : 'Latest completed box-office year as a share of the 2017–2019 average. Null when any baseline year is missing.',
)

const releaseVolumeBars = computed(() =>
  (industry.value?.releaseVolume ?? []).map((entry) => ({
    label: entry.periodLabel,
    values: [{
      key: 'titles',
      label: 'Titles',
      value: entry.titleCount,
      color: 'var(--chart-4)',
    }],
  })),
)

function heatmapTitle(year: number, monthNumber: number, cents: number | null): string {
  const label = `${monthLabels[monthNumber - 1]} ${year}`
  return cents === null ? `${label}: no data` : `${label}: ${formatUsd(cents)}`
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="space-y-1.5">
        <h1 class="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Industry Overview
        </h1>
        <p class="max-w-2xl text-sm text-muted-foreground">
          Domestic theatrical demand, recovery versus pre-pandemic levels, and distributor concentration.
        </p>
      </div>
      <label class="flex items-center gap-2 text-sm text-muted-foreground">
        Recovery baseline
        <select
          v-model="recoveryBaseline"
          class="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
        >
          <option value="2019">2019</option>
          <option value="avg2017_2019">2017–19 avg</option>
        </select>
      </label>
    </div>

    <div class="grid grid-cols-2 gap-3 xl:grid-cols-5 xl:gap-4">
      <DashboardKpiCard
        label="YTD Box Office"
        :value="formatUsdCompact(industry?.ytdBoxOfficeCents)"
        :period="industry?.latestObservationDate ? `through ${industry.latestObservationDate}` : null"
        explainer="Calendar year-to-date domestic box office versus the same dates last year."
        :loading="loading"
      />
      <DashboardKpiCard
        label="YoY Growth"
        :value="formatSignedRatio(industry?.yoyGrowthRatio)"
        :period="industry?.priorYearComparableYtdCents != null
          ? `vs ${formatUsdCompact(industry.priorYearComparableYtdCents)} prior YTD`
          : null"
        explainer="Comparable-period growth, not full prior year versus incomplete current year."
        :loading="loading"
      />
      <DashboardKpiCard
        :label="`Recovery vs ${recoveryBaselineLabel}`"
        :value="formatRatio(industry?.recoveryVs2019Ratio)"
        :period="industry?.recoveryPeriodLabel
          ? `${industry.recoveryPeriodLabel} vs ${industry.recoveryBaselinePeriodLabel}`
          : null"
        :explainer="recoveryExplainer"
        :loading="loading"
      />
      <DashboardKpiCard
        label="Top-10 Concentration"
        :value="formatRatio(industry?.top10Concentration)"
        :period="industry?.latestObservationDate ?? null"
        explainer="Share of the latest day's domestic gross earned by the top 10 films."
        :loading="loading"
      />
      <DashboardKpiCard
        label="Latest Daily"
        :value="formatUsd(industry?.latestDailyTotalCents)"
        :period="industry?.latestObservationDate ?? null"
        explainer="Total domestic box office on the most recent observed day."
        :loading="loading"
      />
    </div>

    <div class="grid gap-4 xl:grid-cols-2">
      <DashboardSectionCard
        title="Monthly box office"
        description="Domestic monthly totals for the current year, prior year, and 2019."
      >
        <div v-if="monthlyBars.length === 0" class="text-sm text-muted-foreground">
          No daily box-office history ingested yet.
        </div>
        <DashboardGroupedBars
          v-else
          :items="monthlyBars"
          :format-value="(value: number) => `$${value.toFixed(0)}M`"
        />
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Cumulative YTD"
        description="Running domestic box office through each month of the year."
      >
        <div v-if="cumulativeLines.length === 0" class="text-sm text-muted-foreground">
          No daily box-office history ingested yet.
        </div>
        <DashboardTrendLines
          v-else
          :series="cumulativeLines"
          :format-value="(value: number) => `$${value.toFixed(1)}B`"
        />
      </DashboardSectionCard>
    </div>

    <DashboardSectionCard
      title="Seasonality heatmap"
      description="Monthly domestic box office for every year since 2019. Hover a cell for the exact total."
    >
      <div v-if="!seasonality" class="text-sm text-muted-foreground">
        No daily box-office history ingested yet.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-2xl border-collapse text-xs">
          <thead>
            <tr>
              <th class="sticky left-0 p-1.5 text-left font-medium text-muted-foreground">Year</th>
              <th
                v-for="label in monthLabels"
                :key="label"
                class="p-1.5 text-center font-medium text-muted-foreground"
              >
                {{ label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="year in seasonality.years" :key="year">
              <td class="p-1.5 font-medium tabular-nums">{{ year }}</td>
              <td
                v-for="row in seasonality.months"
                :key="row.monthNumber"
                :title="heatmapTitle(year, row.monthNumber, row.values[String(year)] ?? null)"
                :style="heatmapCellStyle(row.values[String(year)] ?? null)"
                class="min-w-12 rounded p-1.5 text-center tabular-nums"
              >
                {{ row.values[String(year)] == null ? '—' : formatUsdCompact(row.values[String(year)]) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </DashboardSectionCard>

    <div class="grid gap-4 xl:grid-cols-2">
      <DashboardSectionCard
        title="Annual market history"
        description="Box office years from The Numbers. Ticket volume versus average price shows whether growth is attendance- or price-led."
      >
        <div v-if="marketBars.length === 0" class="text-sm text-muted-foreground">
          No market history ingested yet.
        </div>
        <template v-else>
          <DashboardGroupedBars
            class="mb-6"
            :items="marketBars"
            :format-value="(value: number) => `$${value.toFixed(2)}B`"
          />
          <div class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Box office</TableHead>
                  <TableHead>YoY</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Avg price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="year in recentMarketYears" :key="year.periodLabel">
                  <TableCell>
                    {{ year.periodLabel }}
                    <span v-if="year.isPartial" class="text-muted-foreground"> (partial)</span>
                  </TableCell>
                  <TableCell class="tabular-nums">
                    {{ formatBillions(year.boxOfficeCents) }}
                  </TableCell>
                  <TableCell class="tabular-nums">
                    {{ formatSignedRatio(year.yoyGrowthRatio) }}
                  </TableCell>
                  <TableCell class="tabular-nums">
                    {{ formatMillionsCount(year.ticketsSold) }}
                  </TableCell>
                  <TableCell class="tabular-nums">
                    {{ formatUsdExact(year.averageTicketPriceCents) }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </template>
      </DashboardSectionCard>

      <DashboardSectionCard
        :title="industry?.distributorShares
          ? `Distributor share (${industry.distributorShares.periodLabel}${industry.distributorShares.isPartial ? ' partial' : ''})`
          : 'Distributor share'"
        description="Share of domestic box office among the largest distributors."
      >
        <div v-if="!industry?.distributorShares" class="text-sm text-muted-foreground">
          No distributor share data ingested yet.
        </div>
        <DashboardShareBars v-else :entries="industry.distributorShares.entries" />
      </DashboardSectionCard>
    </div>

    <DashboardSectionCard
      title="Release volume"
      description="Tracked titles per year summed across distributors."
    >
      <div v-if="releaseVolumeBars.length === 0" class="text-sm text-muted-foreground">
        No release-count data ingested yet.
      </div>
      <DashboardGroupedBars
        v-else
        :items="releaseVolumeBars"
        :format-value="(value: number) => `${value.toFixed(0)} titles`"
      />
    </DashboardSectionCard>
  </div>
</template>
