<script setup lang="ts">
import { ONBOARDING_STEPS, useOnboarding } from '../onboarding'
import type { TourAccent } from '../onboarding'
import TourFigure from './visuals/TourFigure.vue'
import { TourShell } from 'rei-kit/app'
import BrandMark from '@/shared/ui/BrandMark.vue'
import { t } from '@/shared/i18n'

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

/**
 * The frame — teleport, `inert`, focus, the arrow keys, the slide direction and
 * the progress track — is the kit's (rei-kit 0.14.0). Hibi had the same 296
 * lines. What is left here is the part that is Kakei's: which slides there are,
 * what they say, and what colour the room is while they are on screen.
 */
const stepLabel = (position: number) => t('onboarding.progress', { current: position, total })
</script>

<template>
  <TourShell
    v-model="tour.isOpen.value"
    :index="tour.index.value"
    :total="total"
    :dialog-label="$t('onboarding.guide')"
    :skip-label="$t('onboarding.skip')"
    :back-label="$t('common.back')"
    :next-label="$t('onboarding.next')"
    :last-label="$t('onboarding.start')"
    :step-label="stepLabel"
    teleport-to="#sheet-root"
    @next="tour.next()"
    @back="tour.back()"
    @dismiss="tour.dismiss()"
    @go-to="tour.goTo($event)"
  >
    <!-- The wash is the only thing that changes colour between slides, so the
         guide has a mood without the copy having to carry it. -->
    <template #wash>
      <Transition name="wash">
        <div
          :key="tour.step.value.accent"
          class="pointer-events-none absolute inset-x-0 top-0 h-[55%] bg-gradient-to-b to-transparent"
          :class="WASH[tour.step.value.accent]"
          aria-hidden="true"
        />
      </Transition>
    </template>

    <div
      :key="tour.step.value.key"
      class="slide flex flex-col gap-6"
      :class="tour.step.value.variant === 'cover' ? 'items-center text-center' : 'items-start'"
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
          :range="tour.step.value.figure.rangeKey ? $t(tour.step.value.figure.rangeKey) : ''"
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
      <p v-if="tour.step.value.noteKey" class="stage text-ink-soft text-xs italic" style="--i: 3">
        {{ $t(tour.step.value.noteKey) }}
      </p>
    </div>
  </TourShell>
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
