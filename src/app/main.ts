import '../assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { queryClient } from '@/app/providers/query.ts'

import App from './App.vue'
import router from './router/router.ts'
import { useAuthStore } from '@/features/auth/auth.store'
import { i18n, loadActiveLocale } from '@/shared/i18n'
import { setThemeStorageKey } from 'rei-kit'
// Side-effect import: registers the beforeinstallprompt listener before Vue
// mounts, because the event fires once and early.
import '@/features/pwa/install'

// Before anything reads the preference. Two rei-kit apps served from the same
// origin — which, on localhost, they will be — would otherwise share one theme
// setting. The inline script in index.html reads the same key.
setThemeStorageKey('kakei-theme')

async function bootstrap() {
  const app = createApp(App)

  app.use(createPinia())
  app.use(i18n)
  app.use(VueQueryPlugin, { queryClient })

  const auth = useAuthStore()

  // Both are needed before the first paint and neither depends on the other.
  await Promise.all([auth.init(), loadActiveLocale()])

  app.use(router)
  await router.isReady()

  app.mount('#app')
}

bootstrap()
