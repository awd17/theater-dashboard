<script setup lang="ts">
import { barY, defineChart, group } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/charts/vue'

const props = defineProps<{
  rows: Array<{ category: string, series: string, value: number }>
  categories: string[]
  seriesLabels: string[]
  seriesColors: string[]
  yMin: number
  yMax: number
  formatValue?: (value: number) => string
  height: number
  chartAriaLabel: string
}>()

const FALLBACK_COLORS = ['#93c5fd', '#1d4ed8', '#0f172a', '#0d9488', '#c2410c']

const ready = ref(false)
const chartWidth = ref(720)

onMounted(() => {
  ready.value = true
})

function tickValues(all: string[]): string[] {
  if (all.length <= 6) {
    return all
  }
  const step = Math.ceil(all.length / 6)
  const values = all.filter((_, index) => index % step === 0)
  const last = all.at(-1)
  if (last && values.at(-1) !== last) {
    values.push(last)
  }
  return values
}

const definition = computed(() => {
  if (!ready.value || props.rows.length === 0 || props.categories.length === 0) {
    return null
  }

  const tickLabels = tickValues(props.categories)

  return defineChart(
    {
      marks: [
        barY(props.rows, {
          x: 'category',
          y: 'value',
          z: 'series',
          color: 'series',
          layout: group({ padding: 0.12 }),
          inset: 1,
        }),
      ],
      scales: {
        x: {
          scale: () =>
            scaleBand<string>()
              .domain([...props.categories])
              .padding(0.2),
          axis: {
            ticks: {
              values: tickLabels,
              format: (value) => String(value),
            },
          },
        },
        y: {
          scale: () => scaleLinear().domain([props.yMin, props.yMax]),
          nice: true,
          grid: true,
          axis: {
            ticks: {
              format: (value: number) =>
                props.formatValue
                  ? props.formatValue(value)
                  : value.toLocaleString('en-US', { maximumFractionDigits: 1 }),
            },
          },
        },
      },
      color: {
        domain: [...props.seriesLabels],
        range: props.seriesColors.map((color, index) =>
          color.startsWith('var(') ? FALLBACK_COLORS[index % FALLBACK_COLORS.length]! : color,
        ),
      },
    },
    { tooltip },
  )
})
</script>

<template>
  <div class="h-full w-full">
    <div
      v-if="!definition"
      class="flex h-full items-center text-sm text-muted-foreground"
    >
      Loading chart…
    </div>
    <Chart
      v-else
      class="h-full w-full"
      :definition="definition"
      :aria-label="chartAriaLabel"
      :height="height"
      :width="chartWidth"
    />
  </div>
</template>
