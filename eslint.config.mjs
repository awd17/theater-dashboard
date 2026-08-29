import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  files: ['app/components/ui/**/*.{vue,ts}'],
  rules: {
    'vue/require-default-prop': 'off',
  },
})
