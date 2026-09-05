<script setup lang="ts">
const props = defineProps<{
  items: Array<{
    label: string
    values: Array<{ key: string, label: string, value: number | null, color: string }>
  }>
  formatValue?: (value: number) => string
  heightClass?: string
  ariaLabel?: string
}>()

const FALLBACK_COLORS = ['#93c5fd', '#1d4ed8', '#0f172a', '#0d9488', '#c2410c']

const rows = computed(() => {
  const result: Array<{ category: string, series: string, value: number }> = []
  for (const item of props.items) {
    for (const series of item.values) {
      if (series.value === null || !Number.isFinite(series.value)) {
        continue
      }
      result.push({
        category: item.label,
        series: series.label,
        value: series.value,
      })
    }
  }
  return result
})

const categories = computed(() => props.items.map((item) => item.label))

const seriesMeta = computed(() => {
  const first = props.items[0]?.values ?? []
  return first.map((series, index) => ({
    label: series.label,
    color: series.color.startsWith('var(')
      ? FALLBACK_COLORS[index % FALLBACK_COLORS.length]!
      : series.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]!,
  }))
})

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
    class="flex min-w-0 w-full flex-col gap-3"
    :class="heightClass ?? 'h-[260px]'"
  >
    <div
      v-if="seriesMeta.length > 0"
      class="flex flex-wrap gap-3 text-xs text-muted-foreground"
    >
      <div
        v-for="entry in seriesMeta"
        :key="entry.label"
        class="flex items-center gap-1.5"
      >
        <span class="size-2 rounded-sm" :style="{ backgroundColor: entry.color }" />
        {{ entry.label }}
      </div>
    </div>
    <div class="min-h-0 min-w-0 flex-1">
      <div
        v-if="rows.length === 0 || seriesMeta.length === 0"
        class="flex h-full items-center text-sm text-muted-foreground"
      >
        No series values to chart.
      </div>
      <DashboardTanstackBarChart
        v-else
        :rows="rows"
        :categories="categories"
        :series-labels="seriesMeta.map((entry) => entry.label)"
        :series-colors="seriesMeta.map((entry) => entry.color)"
        :y-min="yExtent.min"
        :y-max="yExtent.max"
        :format-value="formatValue"
        :height="chartHeight"
        :chart-aria-label="ariaLabel ?? 'Bar chart'"
      />
    </div>
  </div>
</template>
