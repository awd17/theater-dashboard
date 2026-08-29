<script setup lang="ts">
const orpc = useORPC()

const { data, error, status } = await useAsyncData('health', () => orpc.health())
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">
        Dashboard
      </h1>
      <p class="text-sm text-muted-foreground">
        Local workspace for theater industry operations.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>System status</CardTitle>
        <CardDescription>
          Health check through oRPC against the local D1 binding.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3 text-sm">
        <p v-if="status === 'pending'">
          Checking services...
        </p>
        <p v-else-if="error">
          RPC is unavailable.
        </p>
        <template v-else-if="data">
          <p>API is ready.</p>
          <p>
            Database is {{ data.database }}.
          </p>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
