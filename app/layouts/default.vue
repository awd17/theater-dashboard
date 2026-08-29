<script setup lang="ts">
const route = useRoute()

const links = [
  { to: '/', label: 'Industry', match: (path: string) => path === '/' },
  { to: '/operators', label: 'Operators', match: (path: string) => path.startsWith('/operators') },
  {
    to: '/companies/AMC',
    label: 'Companies',
    match: (path: string) => path.startsWith('/companies'),
  },
  { to: '/outlook', label: 'Outlook', match: (path: string) => path.startsWith('/outlook') },
]
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <header class="border-b">
      <div class="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-6">
        <NuxtLink to="/" class="text-sm font-medium tracking-tight">
          Theater Industry Dashboard
        </NuxtLink>
        <nav class="flex items-center gap-1">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="rounded-md px-3 py-1.5 text-sm transition-colors"
            :class="link.match(route.path)
              ? 'bg-muted font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground'"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-7xl px-6 py-8">
      <slot />
    </main>
  </div>
</template>
