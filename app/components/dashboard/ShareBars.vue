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
  <div class="space-y-3">
    <div
      v-for="entry in entries"
      :key="entry.distributor"
      class="grid grid-cols-[minmax(0,1fr)_4.5rem_5.5rem] items-center gap-3 text-sm"
    >
      <div class="min-w-0 space-y-1">
        <div class="flex items-baseline justify-between gap-2">
          <p class="truncate font-medium">
            {{ entry.distributor }}
          </p>
          <span class="shrink-0 tabular-nums text-muted-foreground">
            {{ formatRatio(entry.share) }}
          </span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-muted">
          <div
            class="h-full rounded-full bg-foreground/80"
            :style="{ width: `${Math.max(entry.share * 100, 0.5)}%` }"
          />
        </div>
      </div>
      <p class="text-right tabular-nums text-muted-foreground">
        {{ formatUsdMillions(entry.boxOfficeCents) }}
      </p>
      <p class="text-right tabular-nums text-muted-foreground">
        {{ entry.titleCount }} titles
      </p>
    </div>
  </div>
</template>
