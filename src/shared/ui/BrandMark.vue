<script setup lang="ts">
const { size = 'md' } = defineProps<{ size?: 'sm' | 'md' | 'lg' }>()

const SIZE = {
  sm: { kanji: 'text-[1.6rem]', latin: 'text-[0.6rem]' },
  md: { kanji: 'text-[2.75rem]', latin: 'text-sm' },
  lg: { kanji: 'text-6xl', latin: 'text-base' },
} as const
</script>

<template>
  <!-- The column shrinks to the kanji, so the Latin line below can justify its
       letters across exactly that width. -->
  <span class="inline-flex flex-col items-center gap-1">
    <span
      class="brand-gradient bg-clip-text leading-none font-bold tracking-wide text-transparent"
      :class="SIZE[size].kanji"
      lang="ja"
      aria-hidden="true"
    >
      家計
    </span>

    <span
      class="brand-gradient flex w-full justify-between bg-clip-text leading-none font-semibold text-transparent"
      :class="SIZE[size].latin"
      aria-hidden="true"
    >
      <span>k</span><span>a</span><span>k</span><span>e</span><span>İ</span>
    </span>

    <span class="sr-only">Kakei</span>
  </span>
</template>
