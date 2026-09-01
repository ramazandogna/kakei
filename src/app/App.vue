<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import UpdatePrompt from '@/features/pwa/components/UpdatePrompt.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { computed } from 'vue'
import { Github, Mail } from 'lucide-vue-next'
import { VueQueryDevtools } from '@tanstack/vue-query-devtools'
import { slideDirection } from '@/shared/lib/tab-transition'
import { useThemeSync } from '@/features/profile/use-theme-sync'
import AppErrorBoundary from '@/shared/ui/AppErrorBoundary.vue'

const route = useRoute()
useThemeSync()

const transitionName = computed(() =>
  slideDirection.value === 'none' ? '' : `slide-${slideDirection.value}`,
)

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
  <div class="screen-view">
    <!-- Desktop-only: on a phone the shell fills the screen and this would be
         hidden behind it anyway. The address is split so scrapers miss it. -->
    <aside class="credits">
      <p>© 2026 Kakei</p>
      <a class="credit-link" href="https://github.com/ramazandogna" target="_blank" rel="noopener">
        <Github class="size-3.5" />
        ramazandogna
      </a>
      <span class="credit-link">
        <Mail class="size-3.5" />
        doganrmzn40 [ at ] gmail.com
      </span>
    </aside>

    <div class="shell-frame mobile-screen-view">
      <!-- Inside the shell and above everything in it: an update outranks the
           tab bar, and it has to appear on the auth screens too. -->
      <UpdatePrompt />

      <component :is="layoutComponent">
        <!-- Inside the layout on purpose: a page that throws must not take the
             tab bar with it, because switching tabs is the way out. -->
        <AppErrorBoundary>
          <RouterView v-slot="{ Component, route: matched }">
            <Transition :name="transitionName">
              <component :is="Component" :key="matched.path" :class="pageClass" />
            </Transition>
          </RouterView>
        </AppErrorBoundary>
      </component>
    </div>
  </div>

  <VueQueryDevtools />
</template>

<style>
@reference "@/assets/main.css";

/* A barely-there diamond lattice so the area around the shell is not a flat
   slab. Both layers are theme colours at very low alpha, so it reads as texture
   rather than decoration and inverts with the theme for free. */
.screen-view {
  @apply bg-canvas fixed inset-0 flex items-center justify-center;
  background-image:
    repeating-linear-gradient(
      45deg,
      color-mix(in srgb, var(--color-kon) 5%, transparent) 0 1px,
      transparent 1px 56px
    ),
    repeating-linear-gradient(
      -45deg,
      color-mix(in srgb, var(--color-kon) 5%, transparent) 0 1px,
      transparent 1px 56px
    );
}

.dark .screen-view {
  background-image:
    repeating-linear-gradient(
      45deg,
      color-mix(in srgb, var(--color-ai) 7%, transparent) 0 1px,
      transparent 1px 56px
    ),
    repeating-linear-gradient(
      -45deg,
      color-mix(in srgb, var(--color-ai) 7%, transparent) 0 1px,
      transparent 1px 56px
    );
}

.credits {
  @apply text-ink-soft absolute bottom-6 left-6 hidden flex-col gap-1 text-[11px] md:flex;
}

.credit-link {
  @apply hover:text-primary flex items-center gap-1.5 transition-colors;
}

.mobile-screen-view {
  @apply bg-surface border-hair md:rounded-shell relative m-auto flex flex-col overflow-hidden md:border md:shadow-xl;
}
</style>
