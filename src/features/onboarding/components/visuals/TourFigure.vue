<script setup lang="ts">
/**
 * A headline number with its unit, for the slides where the number is the
 * argument. Set at display size in the brand gradient; everything else defers.
 */
const {
  value,
  label,
  range = '',
} = defineProps<{
  value: string
  label: string
  /** Optional context line, drawn as a bar — a total without one oversells it. */
  range?: string
}>()
</script>

<template>
  <div class="flex flex-col items-start gap-1">
    <span
      class="brand-gradient bg-clip-text text-[4.5rem] leading-[0.85] font-bold tracking-tight text-transparent tabular-nums"
    >
      {{ value }}
    </span>

    <span class="text-ink-soft text-sm font-medium tracking-wide">{{ label }}</span>

    <div v-if="range" class="mt-3 flex w-full max-w-[16rem] flex-col gap-1.5">
      <div class="bg-hair relative h-1.5 w-full overflow-hidden rounded-full">
        <span class="bg-primary/35 absolute inset-y-0 left-0 w-full rounded-full" />
        <span class="bg-primary absolute inset-y-0 left-0 w-[22%] rounded-full" />
      </div>
      <span class="text-ink-soft text-xs tabular-nums">{{ range }}</span>
    </div>
  </div>
</template>
