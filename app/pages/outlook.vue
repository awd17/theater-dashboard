<script setup lang="ts">
import { formatCount } from '@/lib/format'

const orpc = useORPC()
const today = new Date().toISOString().slice(0, 10)

const { data: outlook, status } = await useRpcData(
  'outlook-snapshot',
  () => orpc.outlook.snapshot({ asOfDate: today }),
)

useHead({ title: 'Outlook' })

const loading = computed(() => status.value === 'pending')

const monthlyBars = computed(() =>
  (outlook.value?.monthlyCounts ?? []).map((entry) => ({
    label: entry.month.slice(5) === '01'
      ? entry.month.slice(0, 4)
      : new Date(`${entry.month}-01T00:00:00Z`).toLocaleString('en-US', {
          month: 'short',
          timeZone: 'UTC',
        }),
    values: [{
      key: 'count',
      label: 'Releases',
      value: entry.count,
      color: 'var(--chart-2)',
    }],
  })),
)
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
        description="Count of unique US theatrical titles by release month."
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
  </div>
</template>
