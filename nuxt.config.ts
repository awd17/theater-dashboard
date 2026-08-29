import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/tailwind.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Reel Return',
      meta: [
        {
          name: 'description',
          content: 'Domestic theatrical industry dashboard: box office, operators, and release outlook.',
        },
      ],
    },
  },
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
