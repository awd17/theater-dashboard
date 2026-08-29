<script setup lang="ts">
import { formatRatio, formatUsdMillions } from '@/lib/format'

defineProps<{
  entries: Array<{
    distributor: string
    share: number
    boxOfficeCents: number
    titleCount: number
  }>
}>()
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="entry in entries"
      :key="entry.distributor"
      class="space-y-1.5 text-sm"
    >
      <div class="flex items-baseline justify-between gap-3">
        <p class="min-w-0 truncate font-medium">
          {{ entry.distributor }}
        </p>
        <span class="shrink-0 tabular-nums text-muted-foreground">
          {{ formatRatio(entry.share) }}
        </span>
      </div>
      <div class="h-1.5 overflow-hidden bg-muted">
        <div
          class="h-full bg-primary"
          :style="{ width: `${Math.max(entry.share * 100, 0.5)}%` }"
        />
      </div>
      <div class="flex justify-between gap-3 text-xs text-muted-foreground">
        <p class="tabular-nums">
          {{ formatUsdMillions(entry.boxOfficeCents) }}
        </p>
        <p class="tabular-nums">
          {{ entry.titleCount }} titles
        </p>
      </div>
    </div>
  </div>
</template>
