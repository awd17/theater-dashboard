<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <Card class="min-w-0">
    <CardHeader>
      <CardTitle class="text-base font-medium tracking-tight">
        {{ title }}
      </CardTitle>
      <CardDescription v-if="description">
        {{ description }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <slot />
    </CardContent>
  </Card>
</template>
