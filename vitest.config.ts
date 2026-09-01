import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      server: {
        deps: {
          // Vitest hands node_modules to Node's own loader, which never sees
          // Vite's aliases -- so without this the Supabase tests would run
          // against the real realtime module while the build ships the stub,
          // and would pass no matter what the stub did.
          inline: ['@supabase/supabase-js', 'rei-kit'],
        },
      },
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
