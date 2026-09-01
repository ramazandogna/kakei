<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { CalendarRange, ChartNoAxesColumn, ReceiptText, UserStar } from 'lucide-vue-next'
import { TabBar } from 'rei-kit'
import { useI18n } from 'vue-i18n'
import type { Component } from 'vue'

import type { AppTab } from '@/shared/types/navigation.types'
import { TAB_ORDER, TAB_PATH } from '@/shared/lib/tabs'

const { t } = useI18n()
const route = useRoute()

const ICONS: Record<AppTab, Component> = {
  month: CalendarRange,
  ledger: ReceiptText,
  insights: ChartNoAxesColumn,
  profile: UserStar,
}

/**
 * The bar's shape comes from rei-kit; the tabs are Kakei's.
 *
 * Order and paths come from TAB_ORDER so the bar and the slide direction can
 * never disagree, and the label is looked up per render so it follows the
 * language.
 */
const items = computed(() =>
  TAB_ORDER.map((tab) => ({
    key: tab,
    to: TAB_PATH[tab],
    label: t(`nav.${tab}`),
    icon: ICONS[tab],
  })),
)
</script>

<template>
  <TabBar :items="items" :active="route.meta.tab" :label="$t('nav.main')" />
</template>
