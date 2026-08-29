<script setup lang="ts">
import { MovieRegular } from '@mingcute/vue/core-regular'
import { Menu, X } from '@lucide/vue'

const route = useRoute()
const mobileMenu = ref<HTMLDetailsElement | null>(null)

useHead({
  titleTemplate: (title) => title ? `${title} · Reel Return` : 'Reel Return',
})

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

watch(() => route.path, () => {
  if (mobileMenu.value) {
    mobileMenu.value.open = false
  }
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <header class="relative sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <NuxtLink to="/" class="flex min-w-0 items-center gap-2.5" aria-label="Reel Return">
          <MovieRegular
            :size="22"
            class="shrink-0 text-primary"
            aria-hidden="true"
          />
          <span class="text-[15px] font-semibold tracking-tight">
            Reel Return
          </span>
          <span class="hidden h-3.5 w-px bg-border sm:block" />
          <span class="hidden text-[11px] tracking-wide text-muted-foreground uppercase sm:block">
            Theatrical industry data
          </span>
        </NuxtLink>

        <nav class="hidden items-center gap-0 md:flex" aria-label="Primary">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="border-b-2 px-3 py-1.5 text-sm transition-colors"
            :class="link.match(route.path)
              ? 'border-primary font-medium text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <details ref="mobileMenu" class="group md:hidden">
          <summary
            class="flex size-8 cursor-pointer list-none items-center justify-center rounded-sm border border-border bg-background text-foreground [&::-webkit-details-marker]:hidden"
            aria-label="Open menu"
          >
            <Menu class="size-4 group-open:hidden" />
            <X class="hidden size-4 group-open:block" />
          </summary>
          <nav
            class="absolute top-full left-1/2 z-50 w-screen -translate-x-1/2 border-b border-border/80 bg-background px-4 py-2"
            aria-label="Primary"
          >
            <NuxtLink
              v-for="link in links"
              :key="`mobile-${link.to}`"
              :to="link.to"
              class="block border-l-2 px-3 py-2.5 text-sm"
              :class="link.match(route.path)
                ? 'border-primary bg-accent font-medium text-foreground'
                : 'border-transparent text-muted-foreground'"
            >
              {{ link.label }}
            </NuxtLink>
          </nav>
        </details>
      </div>
    </header>

    <main class="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <slot />
    </main>

    <footer class="border-t border-border/80">
      <div class="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>Reel Return</p>
        <p>Domestic box office, operator filings, and theatrical supply.</p>
      </div>
    </footer>
  </div>
</template>
