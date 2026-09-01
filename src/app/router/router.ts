import { createRouter, createWebHistory } from 'vue-router'
import { authGuard, guestGuard, titleGuard } from './guards'
import { resolveSlideDirection } from '@/shared/lib/tab-transition'
import { isChunkLoadError, shouldReload } from './chunk-recovery'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    /*
    App routes
    */

    {
      path: '/',
      name: 'MonthView',
      component: () => import('@/views/MonthView.vue'),
      meta: {
        layout: 'app',
        requiresAuth: true,
        title: 'Month',
        tab: 'month',
      },
    },
    {
      path: '/ledger',
      name: 'LedgerView',
      component: () => import('@/views/LedgerView.vue'),
      meta: {
        layout: 'app',
        requiresAuth: true,
        title: 'Ledger',
        tab: 'ledger',
      },
    },
    {
      path: '/insights',
      name: 'InsightsView',
      component: () => import('@/views/InsightsView.vue'),
      meta: {
        layout: 'app',
        requiresAuth: true,
        title: 'Insights',
        tab: 'insights',
      },
    },
    {
      path: '/profile',
      name: 'ProfileView',
      component: () => import('@/views/ProfileView.vue'),
      meta: {
        layout: 'app',
        requiresAuth: true,
        title: 'Profile',
        tab: 'profile',
      },
    },

    {
      path: '/settings',
      name: 'SettingsView',
      component: () => import('@/views/SettingsView.vue'),
      meta: {
        layout: 'app',
        requiresAuth: true,
        title: 'Settings',
      },
    },

    /*
    Auth routes
    */

    {
      path: '/login',
      name: 'LoginView',
      component: () => import('@/views/LoginView.vue'),
      meta: {
        layout: 'auth',
        requiresAuth: false,
        title: 'Login',
        guestOnly: true,
      },
    },
    {
      path: '/signup',
      name: 'SignupView',
      component: () => import('@/views/SignupView.vue'),
      meta: {
        layout: 'auth',
        requiresAuth: false,
        title: 'Sign up',
        guestOnly: true,
      },
    },

    /*
    404
    */
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/NotFoundView.vue'),
      meta: {
        layout: 'app',
        requiresAuth: false,
        title: 'Not found',
      },
    },
  ],
})

/**
 * A tab that was open across a deploy is holding an index.html naming chunks
 * the server has already replaced, so the next route change cannot load. There
 * is nothing to recover in place — the code being asked for is gone — and the
 * one correct answer is to fetch the page again. Guarded so a genuinely broken
 * deploy cannot turn into a reload loop.
 */
router.onError((error, to) => {
  if (!isChunkLoadError(error) || !shouldReload()) return

  window.location.assign(to.fullPath)
})

router.beforeEach(authGuard)
router.beforeEach(guestGuard)
router.afterEach(titleGuard)
router.afterEach((to, from) => {
  resolveSlideDirection(to.meta.tab, from.meta.tab)
})

export default router
