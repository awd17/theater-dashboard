import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/tailwind.css'],
  modules: [
    '@nuxt/eslint',
    '@nuxt/test-utils/module',
    'nitro-cloudflare-dev',
    'shadcn-nuxt',
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  typescript: {
    strict: true,
  },
  devServer: {
    host: '127.0.0.1',
  },
  shadcn: {
    prefix: '',
    componentDir: '@/components/ui',
  },
  nitro: {
    preset: 'cloudflare-module',
    compatibilityDate: '2025-07-15',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },
})
