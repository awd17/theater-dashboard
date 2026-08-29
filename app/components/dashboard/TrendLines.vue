<script setup lang="ts">
const props = defineProps<{
  series: Array<{
    key: string
    label: string
    color: string
    points: Array<{ label: string, value: number | null }>
  }>
  formatValue?: (value: number) => string
  heightClass?: string
  ariaLabel?: string
}>()

const CHART_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

const rows = computed(() => {
  const result: Array<{ label: string, series: string, value: number }> = []
  for (const entry of props.series) {
    for (const point of entry.points) {
      if (point.value === null || !Number.isFinite(point.value)) {
        continue
      }
      result.push({
        label: point.label,
        series: entry.label,
        value: point.value,
      })
    }
  }
  return result
})

const labels = computed(() => {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const row of rows.value) {
    if (!seen.has(row.label)) {
      seen.add(row.label)
      ordered.push(row.label)
    }
  }
  return ordered
})

const activeSeries = computed(() =>
  props.series.filter((entry) =>
    entry.points.some((point) => point.value !== null && Number.isFinite(point.value)),
  ),
)

const seriesLabels = computed(() => activeSeries.value.map((entry) => entry.label))
const seriesColors = computed(() =>
  activeSeries.value.map((entry, index) => {
    if (entry.color.startsWith('var(')) {
      return ['#93c5fd', '#1d4ed8', '#0f172a', '#0d9488', '#c2410c'][index % 5]!
    }
    return entry.color || CHART_PALETTE[index % CHART_PALETTE.length]!
  }),
)

const yExtent = computed(() => {
  let min = 0
  let max = 0
  for (const row of rows.value) {
    min = Math.min(min, row.value)
    max = Math.max(max, row.value)
  }
  if (min === max) {
    max = min + 1
  }
  return { min, max }
})

const chartHeight = computed(() => {
  if (props.heightClass?.includes('320')) {
    return 320
  }
  if (props.heightClass?.includes('280')) {
    return 280
  }
  return 260
})
</script>

<template>
  <div
    class="flex w-full flex-col gap-3"
    :class="heightClass ?? 'h-[260px]'"
  >
    <div
      v-if="activeSeries.length > 0"
      class="flex flex-wrap gap-3 text-xs text-muted-foreground"
    >
      <div
        v-for="(entry, index) in activeSeries"
        :key="entry.key"
        class="flex items-center gap-1.5"
      >
        <span
          class="size-2 rounded-sm"
          :style="{ backgroundColor: seriesColors[index] }"
        />
        {{ entry.label }}
      </div>
    </div>
    <div class="min-h-0 flex-1">
      <div
        v-if="rows.length === 0"
        class="flex h-full items-center text-sm text-muted-foreground"
      >
        No series values to chart.
      </div>
      <DashboardTanstackTrendChart
        v-else
        :rows="rows"
        :labels="labels"
        :series-labels="seriesLabels"
        :series-colors="seriesColors"
        :y-min="yExtent.min"
        :y-max="yExtent.max"
        :format-value="formatValue"
        :height="chartHeight"
        :chart-aria-label="ariaLabel ?? 'Trend chart'"
      />
    </div>
  </div>
</template>
