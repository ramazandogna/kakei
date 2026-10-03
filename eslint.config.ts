import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  ...pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,

  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
    rules: {
      ...pluginVitest.configs.recommended.rules,
      // A spec declares throwaway components -- one that throws, one that does
      // not -- to drive the component under test. The rule is about keeping
      // SFCs to a single component, which a .ts test file is not. Hibi turned
      // it off for the same file; this one had been printing three warnings on
      // every run instead, and a warning that is always there is one nobody
      // reads.
      'vue/one-component-per-file': 'off',
    },
  },

  {
    name: 'kit/typed-props',
    files: ['**/*.vue'],
    rules: {
      // Off deliberately. The rule predates typed props: with
      // `defineProps<{ x?: T }>()` the `?` already states that the prop is
      // optional, and demanding a runtime default adds nothing a reader or the
      // compiler did not already know — it only pushes `= undefined` into every
      // destructure, which is noise.
      'vue/require-default-prop': 'off',
    },
  },

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,
)
