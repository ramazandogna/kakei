import 'vue-router'
import type { AppTab } from '@/shared/types/navigation.types'

declare module 'vue-router' {
  interface RouteMeta {
    layout: 'app' | 'auth'
    requiresAuth: boolean
    title: string
    tab?: AppTab
    guestOnly?: boolean
  }
}
