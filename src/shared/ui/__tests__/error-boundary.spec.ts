import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AppErrorBoundary from '../AppErrorBoundary.vue'
import { i18n, t } from '@/shared/i18n'

/**
 * The boundary is the one component whose whole job is to behave correctly when
 * everything else does not, so a test is the only honest way to know it works:
 * reaching it by hand means breaking the app on purpose.
 */

const Boom = defineComponent({
  setup: () => {
    throw new Error('render exploded')
  },
})

const Fine = defineComponent({ render: () => h('p', 'the screen') })

/** Throws on its first render and works from then on, like a transient failure. */
const flaky = () => {
  let renders = 0

  return defineComponent({
    setup: () => {
      if (renders++ === 0) {
        throw new Error('first render exploded')
      }

      return () => h('p', 'recovered')
    },
  })
}

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: Fine, meta: { layout: 'app', requiresAuth: true, title: 'a' } },
    { path: '/next', component: Fine, meta: { layout: 'app', requiresAuth: true, title: 'b' } },
  ],
})

const mountWith = (child: ReturnType<typeof defineComponent>) =>
  mount(AppErrorBoundary, {
    global: { plugins: [router, i18n] },
    slots: { default: () => h(child) },
  })

beforeEach(async () => {
  // The boundary logs every capture; the suite should stay readable.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await router.push('/')
  await router.isReady()
})

describe('AppErrorBoundary', () => {
  it('renders its content untouched while nothing throws', () => {
    const wrapper = mountWith(Fine)

    expect(wrapper.text()).toContain('the screen')
    expect(wrapper.text()).not.toContain(t('error.title'))
  })

  it('replaces a screen that throws with the fallback', async () => {
    const wrapper = mountWith(Boom)
    // The throw aborts the render in progress; the fallback arrives on the
    // re-render that the captured error schedules.
    await nextTick()

    expect(wrapper.text()).toContain(t('error.title'))
    expect(wrapper.text()).toContain(t('error.retry'))
  })

  it('logs the error rather than swallowing it', () => {
    mountWith(Boom)

    expect(console.error).toHaveBeenCalledWith('[error boundary]', expect.any(Error))
  })

  it('clears itself when the user navigates away', async () => {
    const wrapper = mountWith(flaky())
    await nextTick()
    expect(wrapper.text()).toContain(t('error.title'))

    await router.push('/next')
    await flushPromises()

    // The next screen renders instead of inheriting the failure. Were the reset
    // missing, the fallback would follow the user around the whole app.
    expect(wrapper.text()).toContain('recovered')
  })

  it('retries the screen when asked', async () => {
    const wrapper = mountWith(flaky())
    await nextTick()

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('recovered')
  })
})
