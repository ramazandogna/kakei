import { computed, ref } from 'vue'

import { isInstalled, needsIosInstall } from 'rei-kit'

/**
 * The event Chromium fires when it decides the app is installable.
 *
 * Not in lib.dom yet, and it is the only way to trigger the install sheet from
 * our own button rather than the browser's.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const deferred = ref<BeforeInstallPromptEvent | null>(null)
const installed = ref(isInstalled())

/**
 * Captured at module load, not in a component.
 *
 * `beforeinstallprompt` fires once, early, and only once per page load — a
 * listener attached when a component mounts has usually already missed it.
 * `main.ts` imports this file for exactly that reason.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Without this the browser shows its own bar, and then our card and its bar
    // are both on screen saying the same thing.
    event.preventDefault()
    deferred.value = event as BeforeInstallPromptEvent
  })

  window.addEventListener('appinstalled', () => {
    installed.value = true
    deferred.value = null
  })
}

/**
 * Adding Kakei to the Home Screen.
 *
 * Three states, because the platforms genuinely differ: Chromium hands us an
 * event we can trigger from a button, Safari on iOS has no API at all and needs
 * the user walked through Share → Add to Home Screen, and everything else can
 * only be told that installing is possible.
 *
 * @example
 * ```ts
 * const install = useInstall()
 * if (install.canPrompt.value) await install.prompt()
 * ```
 */
export function useInstall() {
  async function prompt(): Promise<boolean> {
    const event = deferred.value
    if (!event) return false

    await event.prompt()
    const { outcome } = await event.userChoice

    // The event is single-use: Chromium refuses a second prompt() on it.
    deferred.value = null

    return outcome === 'accepted'
  }

  return {
    isInstalled: computed(() => installed.value),
    /** A button can open the real install sheet. */
    canPrompt: computed(() => !installed.value && deferred.value !== null),
    /** No API — the user has to be shown the Share menu. */
    needsManualSteps: computed(() => !installed.value && needsIosInstall()),
    prompt,
  }
}
