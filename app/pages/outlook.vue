<script setup lang="ts">
import { formatCount, formatRatio } from '@/lib/format'

const orpc = useORPC()
const today = new Date().toISOString().slice(0, 10)

const { data: outlook, status } = await useRpcData(
  'outlook-snapshot',
  () => orpc.outlook.snapshot({ asOfDate: today }),
)

useHead({ title: 'Outlook' })

const loading = computed(() => status.value === 'pending')

function monthLabel(month: string): string {
  if (month.slice(5) === '01') {
    return month.slice(0, 4)
  }
  return new Date(`${month}-01T00:00:00Z`).toLocaleString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  })
}

const monthlyBars = computed(() =>
  (outlook.value?.monthlySplit ?? []).map((entry) => ({
    label: monthLabel(entry.month),
    values: [
      {
        key: 'wide',
        label: 'Expected wide',
        value: entry.wide,
        color: 'var(--chart-2)',
      },
      {
        key: 'limited',
        label: 'Limited',
        value: entry.limited,
        color: 'var(--chart-4)',
      },
    ],
  })),
)

const releaseTypeTotal = computed(() =>
  (outlook.value?.mixByReleaseType ?? []).reduce((sum, entry) => sum + entry.count, 0),
)

const certificationTotal = computed(() =>
  (outlook.value?.mixByCertification ?? []).reduce((sum, entry) => sum + entry.count, 0),
)

const historicalBars = computed(() =>
  (outlook.value?.historicalReleaseVolume ?? []).map((entry) => ({
    label: entry.periodLabel,
    values: [{
      key: 'titles',
      label: 'Released titles',
      value: entry.titleCount,
      color: 'var(--chart-1)',
    }],
  })),
)

const paceComparison = computed(() => outlook.value?.forwardWindowComparison ?? null)
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-1.5">
      <h1 class="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        Outlook
      </h1>
      <p class="max-w-2xl text-sm text-muted-foreground">
        Upcoming US theatrical supply from TMDB. Observable release counts, not box-office forecasts.
      </p>
    </div>

    <div
      v-if="!loading && outlook && !outlook.hasData"
      class="border p-4 text-sm text-muted-foreground"
    >
      No upcoming releases ingested yet. Zeros below mean no ingest, not an empty slate.
    </div>

    <div class="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
      <DashboardKpiCard
        label="Next 30 days"
        :value="formatCount(outlook?.next30DayCount)"
        period="unique theatrical titles"
        :loading="loading"
        explainer="Films with a confirmed US theatrical release date in the next 30 days."
      />
      <DashboardKpiCard
        label="Next 90 days"
        :value="formatCount(outlook?.next90DayCount)"
        period="unique theatrical titles"
        :loading="loading"
        explainer="Films with a confirmed US theatrical release date in the next 90 days."
      />
      <DashboardKpiCard
        label="Next 180 days"
        :value="formatCount(outlook?.next180DayCount)"
        period="unique theatrical titles"
        :loading="loading"
        explainer="Films with a confirmed US theatrical release date in the next 180 days."
      />
      <DashboardKpiCard
        label="Expected wide (90d)"
        :value="formatCount(outlook?.next90DayWideCount)"
        period="wide-release proxy"
        :loading="loading"
        explainer="Traditional 600+ theater definition, proxied pre-release by excluding re-releases and low-traction titles."
      />
    </div>

    <div class="grid gap-4 xl:grid-cols-2">
      <DashboardSectionCard
        title="Monthly upcoming releases"
        description="Unique US theatrical titles by release month, split into expected wide versus limited."
      >
        <div v-if="loading">
          <Skeleton class="h-[260px] w-full" />
        </div>
        <div v-else-if="monthlyBars.length === 0" class="text-sm text-muted-foreground">
          No upcoming releases ingested yet.
        </div>
        <DashboardGroupedBars
          v-else
          :items="monthlyBars"
          :format-value="(value: number) => String(Math.round(value))"
        />
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Major wide releases"
        description="Next expected wide theatrical openings. Titles provide context; the product is about supply, not discovery."
      >
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="index in 6" :key="index" class="h-8 w-full" />
        </div>
        <div
          v-else-if="!outlook?.upcomingWideReleases.length"
          class="text-sm text-muted-foreground"
        >
          No expected wide releases in the near slate.
        </div>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Release date</TableHead>
              <TableHead>Title</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="release in outlook.upcomingWideReleases"
              :key="`${release.releaseDate}-${release.title}`"
            >
              <TableCell class="whitespace-nowrap tabular-nums">
                {{ release.releaseDate }}
              </TableCell>
              <TableCell class="font-medium">
                {{ release.title }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p class="mt-4 text-xs text-muted-foreground">
          Counts are unique films with confirmed US theatrical dates on TMDB. Wide means the
          traditional 600+ theater definition, proxied pre-release by excluding re-releases and
          low-traction titles; theater counts only confirm wide status after opening.
        </p>
      </DashboardSectionCard>
    </div>

    <div class="grid gap-4 xl:grid-cols-2">
      <DashboardSectionCard
        title="Supply mix by release type"
        description="Share of the next-180-day slate by TMDB release type."
      >
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="index in 3" :key="index" class="h-8 w-full" />
        </div>
        <div
          v-else-if="!outlook?.mixByReleaseType.length"
          class="text-sm text-muted-foreground"
        >
          No upcoming releases ingested yet.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="entry in outlook.mixByReleaseType"
            :key="entry.releaseType"
            class="space-y-1.5 text-sm"
          >
            <div class="flex items-baseline justify-between gap-3">
              <p class="font-medium">
                {{ entry.releaseType }}
              </p>
              <span class="shrink-0 tabular-nums text-muted-foreground">
                {{ formatCount(entry.count) }} · {{ formatRatio(releaseTypeTotal > 0 ? entry.count / releaseTypeTotal : null) }}
              </span>
            </div>
            <div class="h-1.5 overflow-hidden bg-muted">
              <div
                class="h-full bg-primary"
                :style="{ width: `${releaseTypeTotal > 0 ? Math.max((entry.count / releaseTypeTotal) * 100, 0.5) : 0}%` }"
              />
            </div>
          </div>
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Supply mix by certification"
        description="Share of the next-180-day slate by certification. Missing values are labeled Unrated/NA."
      >
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="index in 4" :key="index" class="h-8 w-full" />
        </div>
        <div
          v-else-if="!outlook?.mixByCertification.length"
          class="text-sm text-muted-foreground"
        >
          No upcoming releases ingested yet.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="entry in outlook.mixByCertification"
            :key="entry.certification"
            class="space-y-1.5 text-sm"
          >
            <div class="flex items-baseline justify-between gap-3">
              <p class="font-medium">
                {{ entry.certification }}
              </p>
              <span class="shrink-0 tabular-nums text-muted-foreground">
                {{ formatCount(entry.count) }} · {{ formatRatio(certificationTotal > 0 ? entry.count / certificationTotal : null) }}
              </span>
            </div>
            <div class="h-1.5 overflow-hidden bg-muted">
              <div
                class="h-full bg-primary"
                :style="{ width: `${certificationTotal > 0 ? Math.max((entry.count / certificationTotal) * 100, 0.5) : 0}%` }"
              />
            </div>
          </div>
        </div>
      </DashboardSectionCard>
    </div>

    <DashboardSectionCard
      title="Current supply vs historical pace"
      description="The current 180-day slate against the most recent completed year's release pace."
    >
      <div v-if="loading">
        <Skeleton class="h-[260px] w-full" />
      </div>
      <div v-else-if="!outlook || !outlook.hasData" class="text-sm text-muted-foreground">
        No upcoming releases ingested yet.
      </div>
      <div v-else class="space-y-4">
        <div class="flex flex-wrap gap-6 text-sm">
          <p>
            <span class="text-muted-foreground">Next 180 days: </span>
            <span class="font-medium tabular-nums">{{ formatCount(paceComparison?.currentCount) }}</span>
          </p>
          <p>
            <span class="text-muted-foreground">Historical half-year pace: </span>
            <span class="font-medium tabular-nums">{{ paceComparison?.priorYearSameWindowCount === null || paceComparison?.priorYearSameWindowCount === undefined ? '—' : formatCount(Math.round(paceComparison.priorYearSameWindowCount)) }}</span>
          </p>
        </div>
        <div v-if="historicalBars.length === 0" class="text-sm text-muted-foreground">
          No historical distributor title counts ingested yet.
        </div>
        <DashboardGroupedBars
          v-else
          :items="historicalBars"
          :format-value="(value: number) => String(Math.round(value))"
        />
        <p class="text-xs text-muted-foreground">
          Methodology: historical volume sums domestic distributor title counts from The Numbers per
          calendar year. The half-year pace is the most recent completed (non-partial) year divided
          by two, compared against the current 180-day forward count. Box-office daily rows carry
          grosses, not release slates, so they are never used for this comparison. When history is
          absent the pace is null rather than zero.
        </p>
      </div>
    </DashboardSectionCard>
  </div>
</template>
