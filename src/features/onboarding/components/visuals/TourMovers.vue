<script setup lang="ts">
import { ArrowDownRight, ArrowUpRight } from 'lucide-vue-next'

/**
 * The sentence the Month screen exists to print.
 *
 * Both numbers stay on screen, because a direction of travel means nothing
 * without where it travelled from. Rendered with the app's own tones so the
 * slide is the product, not an impression of it.
 */
const MOVERS = [
  {
    name: 'Konbini',
    from: '¥10,000',
    to: '¥8,000',
    delta: '20%',
    down: true,
    tone: 'bg-tone-clay',
  },
  { name: 'Fun', from: '¥4,000', to: '¥7,200', delta: '80%', down: false, tone: 'bg-tone-indigo' },
] as const
</script>

<template>
  <div class="flex w-full max-w-[19rem] flex-col gap-2" aria-hidden="true">
    <div
      v-for="(mover, index) in MOVERS"
      :key="mover.name"
      class="mover border-hair bg-surface flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
      :style="{ animationDelay: `${index * 130}ms` }"
    >
      <span class="size-2.5 shrink-0 rounded-full" :class="mover.tone" />

      <span class="min-w-0 flex-1">
        <span class="text-ink block text-sm font-medium">{{ mover.name }}</span>
        <span class="text-ink-soft block text-xs tabular-nums">
          {{ mover.from }} → {{ mover.to }}
        </span>
      </span>

      <span
        class="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold"
        :class="mover.down ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'"
      >
        <component :is="mover.down ? ArrowDownRight : ArrowUpRight" class="size-3.5" />
        {{ mover.delta }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.mover {
  opacity: 0;
  animation: rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mover {
    opacity: 1;
    animation: none;
  }
}
</style>
