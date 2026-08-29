<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ title }}</CardTitle>
      <CardDescription v-if="description">
        {{ description }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <slot />
    </CardContent>
  </Card>
</template>
