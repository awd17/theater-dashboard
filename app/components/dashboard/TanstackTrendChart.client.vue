<script setup lang="ts">
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/charts/vue'

const props = defineProps<{
  rows: Array<{ label: string, series: string, value: number }>
  labels: string[]
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
const renderError = ref<string | null>(null)

onMounted(() => {
  ready.value = true
})

function tickValues(all: string[]): string[] {
  if (all.length <= 4) {
    return all
  }
  const step = Math.ceil(all.length / 4)
  const values = all.filter((_, index) => index % step === 0)
  const last = all.at(-1)
  if (last && values.at(-1) !== last) {
    values.push(last)
  }
  return values
}

const definition = computed(() => {
  if (!ready.value || props.rows.length === 0 || props.labels.length === 0) {
    return null
  }

  return defineChart(
    {
      marks: [
        lineY(props.rows, {
          x: 'label',
          y: 'value',
          z: 'series',
          color: 'series',
          points: true,
          strokeWidth: 2,
        }),
      ],
      scales: {
        x: {
          scale: () => scalePoint<string>().domain([...props.labels]).padding(0.2),
          axis: {
            ticks: {
              values: tickValues(props.labels),
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

onErrorCaptured((error) => {
  renderError.value = error instanceof Error ? error.message : String(error)
  return false
})
</script>

<template>
  <div class="h-full w-full">
    <p v-if="renderError" class="text-sm text-destructive">
      Chart error: {{ renderError }}
    </p>
    <Chart
      v-else-if="definition"
      class="h-full w-full"
      :definition="definition"
      :aria-label="chartAriaLabel"
      :height="Math.max(height, 200)"
      :width="720"
    />
    <div
      v-else
      class="flex h-full items-center text-sm text-muted-foreground"
    >
      Loading chart…
    </div>
  </div>
</template>
