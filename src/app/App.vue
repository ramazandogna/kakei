<script setup lang="ts">
import { ToastHost } from 'rei-kit'
import { TabShell } from 'rei-kit/app'
import { RouterView, useRoute } from 'vue-router'
import UpdatePrompt from '@/features/pwa/components/UpdatePrompt.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { computed } from 'vue'
import { Github, Mail } from 'lucide-vue-next'
import { VueQueryDevtools } from '@tanstack/vue-query-devtools'
import { tabTransition } from '@/shared/lib/tabs'
import { useThemeSync } from '@/features/profile/use-theme-sync'
import AppErrorBoundary from '@/shared/ui/AppErrorBoundary.vue'

const route = useRoute()
useThemeSync()

/** App screens clear the tab bar; auth screens must not inherit that padding. */
const pageClass = computed(() => (route.meta.layout === 'app' ? 'page-slide' : 'page-auth'))

const layoutComponent = computed(() => {
  if (route.meta.layout === 'app') {
    return AppLayout
  }

  return AuthLayout
})
</script>

<template>
  <TabShell>
    <!-- Desktop-only: on a phone the shell fills the screen and this would be
         hidden behind it anyway. The address is split so scrapers miss it. -->
    <template #aside>
      <p>© 2026 Kakei</p>
      <a class="credit-link" href="https://github.com/ramazandogna" target="_blank" rel="noopener">
        <Github class="size-3.5" />
        ramazandogna
      </a>
      <span class="credit-link">
        <Mail class="size-3.5" />
        doganrmzn40 [ at ] gmail.com
      </span>
    </template>

    <!-- Inside the shell and above everything in it: an update outranks the
         tab bar, and it has to appear on the auth screens too. -->
    <template #chrome>
      <UpdatePrompt />
    </template>

    <component :is="layoutComponent">
      <!-- Inside the layout on purpose: a page that throws must not take the
           tab bar with it, because switching tabs is the way out. -->
      <AppErrorBoundary>
        <RouterView v-slot="{ Component, route: matched }">
          <Transition :name="tabTransition.name.value">
            <component :is="Component" :key="matched.path" :class="pageClass" />
          </Transition>
        </RouterView>
      </AppErrorBoundary>
    </component>
  </TabShell>

  <!-- Bottom, not top: the top of a phone shell is a status bar and a header,
       and the thumb is nowhere near it. One host for the whole app. -->
  <ToastHost bottom :close-label="$t('common.close')" />
  <VueQueryDevtools />
</template>

<style>
@reference "@/assets/main.css";

/* The frame's texture, in Kakei's colours. TabShell defaults to the ink colour;
   these are the two the app had before it owned the frame. */
.rk-screen {
  --rk-lattice: var(--color-fukami);
}

.dark .rk-screen {
  --rk-lattice: var(--color-wakanae);
  --rk-lattice-alpha: 7%;
}

.credit-link {
  @apply hover:text-primary flex items-center gap-1.5 transition-colors;
}
</style>
