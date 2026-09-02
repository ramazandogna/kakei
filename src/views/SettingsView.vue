<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

import { BaseButton, PageHeader, SettingsGroup, SettingsRow } from 'rei-kit'
import { GraduationCap } from 'lucide-vue-next'

import { useOnboarding } from '@/features/onboarding/onboarding'

import CategoryManager from '@/features/categories/components/CategoryManager.vue'
import RecurringManager from '@/features/recurring/components/RecurringManager.vue'
import InstallSettings from '@/features/pwa/components/InstallSettings.vue'
import DataSection from '@/features/profile/components/DataSection.vue'
import ProfileSettings from '@/features/profile/components/ProfileSettings.vue'

const router = useRouter()
const tour = useOnboarding()
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <PageHeader :title="$t('settings.title')">
      <template #left>
        <button
          type="button"
          class="text-ink-soft hover:text-ink hover:bg-muted flex size-10 items-center justify-center rounded-full transition-colors active:scale-90"
          :aria-label="$t('common.back')"
          @click="router.back()"
        >
          <ArrowLeft class="size-5" />
        </button>
      </template>
    </PageHeader>

    <ProfileSettings />

    <section class="flex flex-col gap-2">
      <h2 class="text-ink-soft px-1 text-xs font-semibold tracking-wide uppercase">
        {{ $t('category.title') }}
      </h2>

      <CategoryManager />
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="text-ink-soft px-1 text-xs font-semibold tracking-wide uppercase">
        {{ $t('recurring.title') }}
      </h2>
      <p class="text-ink-soft px-1 text-xs">{{ $t('recurring.settingsBody') }}</p>

      <RecurringManager />
    </section>

    <SettingsGroup :title="$t('onboarding.guide')">
      <SettingsRow
        :label="$t('onboarding.guide')"
        :description="$t('onboarding.guideHint')"
        :icon="GraduationCap"
        stacked
      >
        <BaseButton variant="ghost" size="sm" class="self-start" @click="tour.restart()">
          {{ $t('onboarding.guide') }}
        </BaseButton>
      </SettingsRow>
    </SettingsGroup>

    <InstallSettings />

    <DataSection />
  </div>
</template>
