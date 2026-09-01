<script setup lang="ts">
import { computed, ref } from 'vue'
import { Download, Share } from 'lucide-vue-next'

import { useInstall } from '../install'
import { addDays, todayKey } from 'rei-kit'

const { canPrompt, needsManualSteps, prompt } = useInstall()

const SNOOZE_KEY = 'kakei-install-nudge'
const SNOOZE_DAYS = 7

function readSnooze(): string {
  try {
    return localStorage.getItem(SNOOZE_KEY) ?? ''
  } catch {
    return ''
  }
}

const snoozed = ref(readSnooze())

const visible = computed(
  () => (canPrompt.value || needsManualSteps.value) && todayKey() >= snoozed.value,
)

function snooze() {
  const until = addDays(todayKey(), SNOOZE_DAYS)
  snoozed.value = until

  try {
    localStorage.setItem(SNOOZE_KEY, until)
  } catch {
    // Storage blocked; it reappears next session rather than never.
  }
}

async function install() {
  await prompt()

  // Accepted or dismissed, stop asking for a week. The prompt is what gets
  // tiring, not the answer.
  snooze()
}
</script>

<template>
  <Transition name="install">
    <section
      v-if="visible"
      class="border-primary/25 bg-primary/5 rounded-card flex gap-3 border p-3.5"
    >
      <span
        class="bg-primary/15 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl"
        aria-hidden="true"
      >
        <component :is="needsManualSteps ? Share : Download" class="size-5" />
      </span>

      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <p class="text-ink text-sm font-semibold">
            {{ needsManualSteps ? $t('install.iosTitle') : $t('install.title') }}
          </p>
          <p class="text-ink-soft mt-0.5 text-xs leading-relaxed">
            {{ needsManualSteps ? $t('install.iosBody') : $t('install.body') }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <!-- No button on iOS: Safari exposes no way to open the Share sheet
               from script, so a button here could only fail. -->
          <button
            v-if="canPrompt"
            type="button"
            class="bg-primary rounded-full px-3.5 py-2 text-xs font-semibold text-white transition-transform duration-100 active:scale-95"
            @click="install"
          >
            {{ $t('install.action') }}
          </button>

          <button
            type="button"
            class="text-ink-soft hover:text-ink rounded-full px-3 py-2 text-xs font-medium transition-colors"
            @click="snooze"
          >
            {{ $t('install.later') }}
          </button>
        </div>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.install-enter-active,
.install-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}
.install-enter-from,
.install-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .install-enter-from,
  .install-leave-to {
    transform: none;
  }
}
</style>
