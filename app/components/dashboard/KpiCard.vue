<script setup lang="ts">
import { Info } from '@lucide/vue'
import { deltaTone, formatSignedRatio } from '@/lib/format'

const props = defineProps<{
  label: string
  value: string
  delta?: number | null
  period?: string | null
  explainer?: string
  loading?: boolean
}>()

const tone = computed(() => deltaTone(props.delta ?? null))
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <div class="flex items-start justify-between gap-2">
        <CardDescription class="text-xs font-medium tracking-wide uppercase">
          {{ label }}
        </CardDescription>
        <TooltipProvider v-if="explainer">
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                type="button"
                class="text-muted-foreground hover:text-foreground"
                :aria-label="`About ${label}`"
              >
                <Info class="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent class="max-w-xs text-xs">
              {{ explainer }}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <CardTitle class="text-2xl font-semibold tracking-tight tabular-nums">
        <Skeleton v-if="loading" class="h-8 w-28" />
        <template v-else>
          {{ value }}
        </template>
      </CardTitle>
    </CardHeader>
    <CardContent class="pt-0">
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <Badge
          v-if="!loading && delta !== undefined && delta !== null"
          :variant="tone === 'positive' ? 'secondary' : tone === 'negative' ? 'destructive' : 'outline'"
          class="tabular-nums"
        >
          {{ formatSignedRatio(delta) }}
        </Badge>
        <span v-if="period" class="text-muted-foreground">
          {{ period }}
        </span>
      </div>
    </CardContent>
  </Card>
</template>
