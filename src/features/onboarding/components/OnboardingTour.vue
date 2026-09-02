<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'

import { ONBOARDING_STEPS, useOnboarding } from '../onboarding'
import type { TourAccent } from '../onboarding'
import TourFigure from './visuals/TourFigure.vue'
import { BaseButton } from 'rei-kit'
import BrandMark from '@/shared/ui/BrandMark.vue'

const tour = useOnboarding()

const total = ONBOARDING_STEPS.length

/**
 * Ambient wash per slide. Full class strings, because Tailwind reads source
 * files as text and never sees a name assembled at runtime.
 */
const WASH: Record<TourAccent, string> = {
  fukami: 'from-fukami/18',
  midori: 'from-midori/18',
  wakanae: 'from-wakanae/25',
  akane: 'from-akane/18',
  kohaku: 'from-kohaku/18',
}

const dialog = ref<HTMLElement | null>(null)

/** Direction, so the dots can jump backwards and still animate backwards. */
const transitionName = ref('tour-forward')

watch(tour.index, (next, previous) => {
  transitionName.value = next >= previous ? 'tour-forward' : 'tour-backward'
})

/**
 * Same trick the sheets use: `inert` takes the app behind the guide out of tab
 * order and pointer events, so Tab cannot walk into a screen the user cannot
 * see. Focusing the dialog is what makes the arrow keys work at all.
 */
// `immediate` matters now that the layout mounts this component only once the
// guide has been asked for: without it the first `true` predates the watcher.
watch(
  tour.isOpen,
  async (open) => {
    document.getElementById('app')?.toggleAttribute('inert', open)
    if (!open) return

    await nextTick()
    dialog.value?.focus()
  },
  { immediate: true },
)

onUnmounted(() => document.getElementById('app')?.removeAttribute('inert'))

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') tour.next()
  if (event.key === 'ArrowLeft') tour.back()
}
</script>

<template>
  <!-- Teleported for the same reason sheets are: the shell clips its children,
       and the guide has to cover the tab bar and the header alike. -->
  <Teleport to="#sheet-root">
    <Transition name="tour" appear>
      <div
        v-if="tour.isOpen.value"
        ref="dialog"
        class="fixed inset-0 z-[60] flex items-center justify-center outline-none"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('onboarding.guide')"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <div class="shell-frame md:rounded-shell bg-canvas relative flex flex-col overflow-hidden">
          <!-- The wash is the only thing that changes colour between slides, so
               the guide has a mood without the copy having to carry it. -->
          <Transition name="wash">
            <div
              :key="tour.step.value.accent"
              class="pointer-events-none absolute inset-x-0 top-0 h-[55%] bg-gradient-to-b to-transparent"
              :class="WASH[tour.step.value.accent]"
              aria-hidden="true"
            />
          </Transition>

          <header class="relative flex shrink-0 items-center justify-between gap-3 px-6 pt-6">
            <span class="text-ink-soft text-xs font-semibold tabular-nums">
              {{ $t('onboarding.progress', { current: tour.index.value + 1, total }) }}
            </span>

            <button
              type="button"
              class="text-ink-soft hover:text-ink rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
              @click="tour.dismiss()"
            >
              {{ $t('onboarding.skip') }}
            </button>
          </header>

          <!-- min-h-0 keeps the body inside the shell so long slides scroll here
               rather than pushing the buttons off the bottom. -->
          <div
            class="relative flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-6 py-6"
          >
            <Transition :name="transitionName" mode="out-in">
              <div
                :key="tour.step.value.key"
                class="slide flex flex-col gap-6"
                :class="
                  tour.step.value.variant === 'cover' ? 'items-center text-center' : 'items-start'
                "
              >
                <div v-if="tour.step.value.variant === 'cover'" class="stage" style="--i: 0">
                  <BrandMark size="lg" />
                </div>

                <div
                  v-if="tour.step.value.figure || tour.step.value.visual"
                  class="stage flex w-full"
                  :class="tour.step.value.variant === 'cover' ? 'justify-center' : ''"
                  style="--i: 0"
                >
                  <TourFigure
                    v-if="tour.step.value.figure"
                    :value="$t(tour.step.value.figure.valueKey)"
                    :label="$t(tour.step.value.figure.labelKey)"
                    :range="
                      tour.step.value.figure.rangeKey ? $t(tour.step.value.figure.rangeKey) : ''
                    "
                  />
                  <component :is="tour.step.value.visual" v-else />
                </div>

                <h2
                  class="stage text-ink text-[1.75rem] leading-[1.15] font-semibold tracking-tight text-balance"
                  style="--i: 1"
                >
                  {{ $t(`onboarding.${tour.step.value.key}Title`) }}
                </h2>

                <p class="stage text-ink-soft text-[15px] leading-relaxed" style="--i: 2">
                  {{ $t(`onboarding.${tour.step.value.key}Body`) }}
                </p>

                <!-- Set apart and quiet: it is there to be checked, not to be
                     read as part of the argument. -->
                <p
                  v-if="tour.step.value.noteKey"
                  class="stage text-ink-soft text-xs italic"
                  style="--i: 3"
                >
                  {{ $t(tour.step.value.noteKey) }}
                </p>
              </div>
            </Transition>
          </div>

          <footer
            class="relative flex shrink-0 flex-col gap-4 px-6 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]"
          >
            <!-- A segmented track rather than dots: ten slides is a sequence
                 with a length, and the reader deserves to see how much is left. -->
            <div
              class="-my-2 flex items-center gap-1"
              role="tablist"
              :aria-label="$t('onboarding.progress', { current: tour.index.value + 1, total })"
            >
              <button
                v-for="(item, position) in ONBOARDING_STEPS"
                :key="item.key"
                type="button"
                role="tab"
                :aria-selected="position === tour.index.value"
                :aria-label="$t('onboarding.progress', { current: position + 1, total })"
                class="group flex flex-1 items-center py-2.5"
                @click="tour.goTo(position)"
              >
                <span
                  class="h-1 w-full rounded-full transition-colors duration-300"
                  :class="
                    position <= tour.index.value
                      ? 'bg-primary'
                      : 'bg-hair group-hover:bg-ink-soft/40'
                  "
                />
              </button>
            </div>

            <div class="flex gap-2">
              <BaseButton
                v-if="tour.index.value > 0"
                variant="ghost"
                class="shrink-0 px-5"
                @click="tour.back()"
              >
                {{ $t('common.back') }}
              </BaseButton>

              <BaseButton class="flex-1" @click="tour.next()">
                {{ tour.isLast.value ? $t('onboarding.start') : $t('onboarding.next') }}
              </BaseButton>
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tour-enter-active,
.tour-leave-active {
  transition: opacity 220ms ease;
}
.tour-enter-from,
.tour-leave-to {
  opacity: 0;
}

.wash-enter-active,
.wash-leave-active {
  position: absolute;
  transition: opacity 500ms ease;
}
.wash-enter-from,
.wash-leave-to {
  opacity: 0;
}

.tour-forward-enter-active,
.tour-forward-leave-active,
.tour-backward-enter-active,
.tour-backward-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms cubic-bezier(0.32, 0.72, 0, 1);
}
.tour-forward-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.tour-forward-leave-to,
.tour-backward-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.tour-backward-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Figure, then headline, then body, then citation. The order the eye should
   take them in, made literal — and the reason each slide feels composed rather
   than swapped. */
.tour-forward-enter-active .stage,
.tour-backward-enter-active .stage {
  opacity: 0;
  animation: rise 420ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: calc(var(--i) * 70ms + 60ms);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tour-forward-enter-from,
  .tour-forward-leave-to,
  .tour-backward-enter-from,
  .tour-backward-leave-to {
    transform: none;
  }

  .tour-forward-enter-active .stage,
  .tour-backward-enter-active .stage {
    opacity: 1;
    animation: none;
  }
}
</style>
