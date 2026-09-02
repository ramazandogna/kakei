import { computed, ref } from 'vue'
import type { Component } from 'vue'

import TourDonut from './components/visuals/TourDonut.vue'
import TourFixed from './components/visuals/TourFixed.vue'
import TourMovers from './components/visuals/TourMovers.vue'
import TourNecessity from './components/visuals/TourNecessity.vue'
import TourPrivacy from './components/visuals/TourPrivacy.vue'

/** Ambient wash behind a slide. Written out because Tailwind scans plain text. */
export type TourAccent = 'fukami' | 'midori' | 'wakanae' | 'akane' | 'kohaku'

export interface OnboardingStep {
  /** Message key stem: `onboarding.<key>Title` / `<key>Body`. */
  key: string
  accent: TourAccent
  /** Cover and closing slides centre their copy; the rest are left-aligned. */
  variant?: 'cover' | 'default'
  /** Illustration above the copy. */
  visual?: Component
  /** A headline number, for the slides where the number is the argument. */
  figure?: { valueKey: string; labelKey: string; rangeKey?: string }
  /** Marks a number as arithmetic rather than a finding. */
  noteKey?: string
}

/**
 * The guide, in the order it argues.
 *
 * It earns the right to your attention before it explains a button: what an
 * entry costs you in seconds, and what the small ones add up to over a year.
 * Only then does it show what the app does with them.
 *
 * Every number here is arithmetic the reader can check, and the slides say so.
 * Kakei makes no claims about research it has not read — a money app does not
 * need to borrow authority to argue that writing things down helps.
 *
 * Typed as a non-empty tuple, not an array: with `noUncheckedIndexedAccess`
 * that is what makes `ONBOARDING_STEPS[0]` a step rather than a maybe-step.
 */
export const ONBOARDING_STEPS: readonly [OnboardingStep, ...OnboardingStep[]] = [
  { key: 'cover', accent: 'fukami', variant: 'cover' },
  {
    key: 'seconds',
    accent: 'midori',
    figure: { valueKey: 'onboarding.secondsValue', labelKey: 'onboarding.secondsLabel' },
  },
  {
    key: 'small',
    accent: 'kohaku',
    figure: {
      valueKey: 'onboarding.smallValue',
      labelKey: 'onboarding.smallLabel',
      rangeKey: 'onboarding.smallRange',
    },
    noteKey: 'onboarding.smallNote',
  },
  { key: 'necessity', accent: 'akane', visual: TourNecessity },
  { key: 'reckoning', accent: 'fukami', visual: TourDonut },
  { key: 'against', accent: 'midori', visual: TourMovers },
  { key: 'fixed', accent: 'wakanae', visual: TourFixed },
  { key: 'privacy', accent: 'fukami', visual: TourPrivacy },
  { key: 'start', accent: 'midori', variant: 'cover' },
]

/**
 * Versioned on purpose: bumping it re-shows the guide to everyone, which is the
 * only sane way to introduce a screen that did not exist when they first ran it.
 */
const STORAGE_KEY = 'kakei-onboarding-v1'

function hasSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'done'
  } catch {
    // Storage blocked. Showing the guide once per session beats never.
    return false
  }
}

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, 'done')
  } catch {
    // Storage blocked; it will appear again next time.
  }
}

// Module-level singleton: the layout renders the tour and Settings restarts it,
// and both have to be looking at the same state.
const isOpen = ref(false)
const index = ref(0)

/**
 * The first-run guide.
 *
 * @example
 * ```ts
 * const tour = useOnboarding()
 * tour.openIfFirstRun()  // app start
 * tour.restart()         // Settings
 * ```
 */
export function useOnboarding() {
  const step = computed(() => ONBOARDING_STEPS[index.value] ?? ONBOARDING_STEPS[0])
  const isLast = computed(() => index.value === ONBOARDING_STEPS.length - 1)

  function openIfFirstRun() {
    if (hasSeen()) return

    index.value = 0
    isOpen.value = true
  }

  function restart() {
    index.value = 0
    isOpen.value = true
  }

  /** Skipping and finishing both count as seen — nobody wants it twice. */
  function dismiss() {
    isOpen.value = false
    markSeen()
  }

  function next() {
    if (isLast.value) dismiss()
    else index.value += 1
  }

  function back() {
    index.value = Math.max(index.value - 1, 0)
  }

  function goTo(target: number) {
    index.value = Math.min(Math.max(target, 0), ONBOARDING_STEPS.length - 1)
  }

  return { isOpen, index, step, isLast, openIfFirstRun, restart, dismiss, next, back, goTo }
}
