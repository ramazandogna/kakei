import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import AppNavbar from '../components/app/AppNavbar.vue'
import { i18n } from '@/shared/i18n'
import { TAB_ORDER, TAB_PATH } from '@/shared/lib/tabs'

/**
 * The bottom bar has to actually mount.
 *
 * It is the one component the app renders from rei-kit that talks to
 * vue-router, so it is the first thing to break if the package ever ships its
 * own copy of the router: `RouterLink` then injects a key the app never
 * provided, `setup` throws, and the bar silently vanishes while the rest of the
 * app carries on. That shipped once. Type-checking cannot see it, because both
 * halves are individually well typed.
 */

const Blank = defineComponent({ render: () => h('div') })

const mountNavbar = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: TAB_ORDER.map((tab) => ({
      path: TAB_PATH[tab],
      component: Blank,
      meta: { tab, layout: 'app', requiresAuth: true, title: tab } as const,
    })),
  })

  router.push(TAB_PATH.ledger)
  await router.isReady()

  return mount(AppNavbar, { global: { plugins: [router, i18n] } })
}

describe('AppNavbar', () => {
  it('renders a link for every tab', async () => {
    const links = (await mountNavbar()).findAll('a')

    expect(links).toHaveLength(TAB_ORDER.length)
    expect(links.map((link) => link.attributes('href'))).toEqual(
      TAB_ORDER.map((tab) => TAB_PATH[tab]),
    )
  })

  it('marks the current route as the active tab', async () => {
    const active = (await mountNavbar()).get('[aria-current="page"]')

    expect(active.attributes('href')).toBe(TAB_PATH.ledger)
  })
})
