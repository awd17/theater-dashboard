<template>
  <div class="min-h-screen bg-background text-foreground">
    <header class="border-b">
      <div class="mx-auto flex h-14 max-w-5xl items-center px-6">
        <p class="text-sm font-medium">
          Theater Industry Dashboard
        </p>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-6 py-10">
      <slot />
    </main>
  </div>
</template>
