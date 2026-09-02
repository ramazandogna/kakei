<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next'

/**
 * One lock, and the rows it is standing in front of.
 *
 * The slide's claim is that the database refuses other people's rows rather
 * than the app hiding them, so the drawing shows rows going dim behind a shield
 * instead of a padlock floating on its own.
 */
</script>

<template>
  <div class="relative flex w-full max-w-[17rem] flex-col gap-1.5" aria-hidden="true">
    <span
      v-for="row in 5"
      :key="row"
      class="bg-hair h-5 rounded-md"
      :style="{ width: `${100 - row * 9}%`, opacity: row > 2 ? 0.4 : 1 }"
    />

    <span
      class="bg-primary absolute -right-1 bottom-0 flex size-12 items-center justify-center rounded-2xl text-white shadow-lg"
    >
      <ShieldCheck class="size-6" />
    </span>
  </div>
</template>
