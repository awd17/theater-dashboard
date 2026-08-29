<script setup lang="ts">
const orpc = useORPC()

const { data: health, error: healthError, status: healthStatus } = await useAsyncData(
  'health',
  () => orpc.health(),
)

const { data: industry, error: industryError, status: industryStatus } = await useAsyncData(
  'industry-snapshot',
  () => orpc.industry.snapshot(),
)

const today = new Date().toISOString().slice(0, 10)

const { data: outlook, error: outlookError, status: outlookStatus } = await useAsyncData(
  'outlook-snapshot',
  () => orpc.outlook.snapshot({ asOfDate: today }),
)

function formatUsd(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '—'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatRatio(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined) {
    return '—'
  }
  return `${(ratio * 100).toFixed(1)}%`
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">
        Dashboard
      </h1>
      <p class="text-sm text-muted-foreground">
        Theatrical industry analytics from public data.
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>System status</CardTitle>
          <CardDescription>
            Health check through oRPC against the local D1 binding.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3 text-sm">
          <p v-if="healthStatus === 'pending'">
            Checking services...
          </p>
          <p v-else-if="healthError">
            RPC is unavailable.
          </p>
          <template v-else-if="health">
            <p>API is ready.</p>
            <p>
              Database is {{ health.database }}.
            </p>
          </template>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Industry snapshot</CardTitle>
          <CardDescription>
            Domestic box office derived from The Numbers observations.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3 text-sm">
          <p v-if="industryStatus === 'pending'">
            Loading industry metrics...
          </p>
          <p v-else-if="industryError">
            Industry snapshot is unavailable.
          </p>
          <template v-else-if="industry">
            <p>
              Latest day:
              {{ industry.latestObservationDate ?? '—' }}
              ·
              {{ formatUsd(industry.latestDailyTotalCents) }}
            </p>
            <p>
              YTD:
              {{ formatUsd(industry.ytdBoxOfficeCents) }}
              · YoY:
              {{ formatRatio(industry.yoyGrowthRatio) }}
            </p>
            <p>
              Top-10 concentration:
              {{ formatRatio(industry.top10Concentration) }}
            </p>
            <p>
              Recovery vs 2019<span v-if="industry.recoveryPeriodLabel"> ({{ industry.recoveryPeriodLabel }})</span>:
              {{ formatRatio(industry.recoveryVs2019Ratio) }}
            </p>
            <p class="text-muted-foreground">
              Recovery uses The Numbers box-office-year market totals, not calendar-year sums of daily charts.
            </p>
          </template>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outlook</CardTitle>
          <CardDescription>
            Upcoming US theatrical releases from TMDB.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3 text-sm">
          <p v-if="outlookStatus === 'pending'">
            Loading outlook...
          </p>
          <p v-else-if="outlookError">
            Outlook is unavailable.
          </p>
          <template v-else-if="outlook">
            <p>
              Next 30 / 90 / 180 days:
              {{ outlook.next30DayCount }} / {{ outlook.next90DayCount }} / {{ outlook.next180DayCount }} releases
            </p>
            <p>
              Expected wide releases next 90 days: {{ outlook.next90DayWideCount }}
            </p>
            <div v-if="outlook.upcomingWideReleases.length > 0">
              <p class="font-medium">
                Next wide releases
              </p>
              <ul class="mt-1 space-y-1 text-muted-foreground">
                <li v-for="release in outlook.upcomingWideReleases" :key="release.title + release.releaseDate">
                  {{ release.releaseDate }} · {{ release.title }}
                </li>
              </ul>
            </div>
            <p class="text-muted-foreground">
              Counts are unique films with confirmed US theatrical dates on TMDB.
              Wide means the traditional 600+ theater definition, proxied pre-release by
              excluding re-releases and low-traction titles; theater counts only confirm
              wide status after opening.
            </p>
          </template>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
