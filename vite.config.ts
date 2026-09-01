import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    /**
     * Absolute URLs for the social card.
     *
     * Open Graph asks for absolute URLs, but the app never hardcodes its own
     * origin anywhere else -- auth uses `window.location.origin` -- so the
     * origin arrives as build-time configuration, and an unset variable
     * degrades to a root-relative path rather than leaving a broken
     * placeholder in the markup.
     */
    {
      name: 'kakei:site-url',
      transformIndexHtml: (html: string) =>
        html.replaceAll('%SITE_URL%', (process.env['VITE_SITE_URL'] ?? '').replace(/\/$/, '')),
    },
    vue(),
    vueDevTools(),
    tailwindcss(),
    VitePWA({
      // 'prompt', not 'autoUpdate': swapping the app out from under someone
      // mid-entry is how you lose the transaction they were typing.
      registerType: 'prompt',
      // generateSW rather than injectManifest: this app has no push handler and
      // nothing else a hand-written worker would be for. Hibi needs one; Kakei
      // would only be maintaining a copy of what Workbox already emits.
      strategies: 'generateSW',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kakei — money tracker',
        short_name: 'Kakei',
        description: 'What came in, what went out, and where it went.',
        lang: 'en',
        theme_color: '#2F3B8F',
        background_color: '#F7F5F0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // The social card is for crawlers; no one running the app ever requests
        // it, so precaching it would cost every install its weight for nothing.
        globIgnores: ['**/og.png'],
        // Every route is client-side, so a cold navigation to /ledger must be
        // answered with the shell -- the same rule vercel.json applies on the
        // server.
        navigateFallback: 'index.html',
      },
      devOptions: {
        // Off by default: a service worker in dev caches the very files you are
        // editing. Flip it on deliberately when testing install behaviour.
        enabled: false,
      },
    }),
  ],
  resolve: {
    // A linked package resolves its own copy of these, which gives the app two
    // Vue runtimes: composables stop sharing state and the types stop matching.
    // Harmless once rei-kit is installed from the registry, essential while it
    // is linked for development.
    dedupe: ['vue', 'vue-i18n', 'vue-router'],
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },

      // Supabase ships as an umbrella package. These three are never called by
      // this app, and emptying them takes 106 kB (25 kB gzip) off the critical
      // path. See build/supabase-unused.js for why it is done this way.
      ...['realtime-js', 'storage-js', 'functions-js'].map((name) => ({
        find: `@supabase/${name}`,
        replacement: fileURLToPath(new URL('./build/supabase-unused.js', import.meta.url)),
      })),
    ],
  },
  /**
   * vue-i18n ships its esm-bundler build expecting the host to resolve these.
   * Undefined, the bundler keeps the legacy Options API, the full install path
   * and the devtools hooks — none of which this app uses, all of which it was
   * paying for.
   */
  define: {
    __VUE_I18N_FULL_INSTALL__: false,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false,
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * Split the vendors by package family.
         *
         * Without this Rollup merges supabase-js, Vue and vue-i18n into one
         * file named after whichever module it happened to pick first, so
         * changing a Turkish string invalidates the same cache entry as the
         * Supabase SDK. This does not make the first load smaller; it makes the
         * second one only re-fetch what actually changed.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('@tanstack')) return 'vendor-query'
          if (id.includes('vue-i18n') || id.includes('@intlify')) return 'vendor-i18n'
          if (id.includes('/vue/') || id.includes('vue-router') || id.includes('/pinia/')) {
            return 'vendor-vue'
          }

          return undefined
        },
      },
    },
  },
})
