<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut, Settings, UserRound } from 'lucide-vue-next'

import {
  BaseInput,
  PageHeader,
  SettingsGroup,
  SettingsRow,
  StatCard,
  formatDate,
  useDebouncedCallback,
} from 'rei-kit'

import { useAuthStore } from '@/features/auth/auth.store'
import { useCategories } from '@/features/categories/categories.queries'
import { useTransactionCount } from '@/features/transactions/transactions.queries'
import { useProfile, useUpdateProfile } from '@/features/profile/profile.queries'
import InstallPrompt from '@/features/pwa/components/InstallPrompt.vue'

const auth = useAuthStore()
const router = useRouter()

const { data: categories } = useCategories()
const { data: transactionCount } = useTransactionCount()
const { data: profile } = useProfile()
const update = useUpdateProfile()

const email = computed(() => auth.user?.email ?? '')

const displayName = ref('')

// Seed the field once the row arrives, without fighting the user's typing.
watch(
  profile,
  (next) => {
    if (next && displayName.value === '') displayName.value = next.display_name ?? ''
  },
  { immediate: true },
)

const saveName = useDebouncedCallback((value: string) => {
  update.mutate({ display_name: value.trim() || null })
}, 800)

watch(displayName, (value) => {
  if (profile.value && value !== (profile.value.display_name ?? '')) saveName.run(value)
})

/** Falls back to the email, then to a neutral glyph rather than a stray '?'. */
const initial = computed(
  () => (displayName.value.trim() || email.value).charAt(0).toUpperCase() || '',
)

const memberSince = computed(() => {
  const createdAt = auth.user?.created_at
  if (!createdAt) return ''

  return formatDate(new Date(createdAt), { month: 'long', year: 'numeric' })
})

async function logout() {
  await auth.signOut()
  await router.push('/login')
}
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <PageHeader :title="$t('profile.title')">
      <template #left>
        <RouterLink
          to="/settings"
          class="text-ink-soft hover:text-ink hover:bg-muted flex size-10 items-center justify-center rounded-full transition-colors active:scale-90"
          :aria-label="$t('settings.title')"
        >
          <Settings class="size-5" />
        </RouterLink>
      </template>
      <template #right>
        <button
          type="button"
          class="text-ink-soft hover:text-negative hover:bg-negative/10 flex size-10 items-center justify-center rounded-full transition-colors active:scale-90"
          :aria-label="$t('profile.signOut')"
          @click="logout"
        >
          <LogOut class="size-5" />
        </button>
      </template>
    </PageHeader>

    <!-- The identity block carries the brand gradient because it is the one
         place in the app that is about the person rather than the money. -->
    <section class="border-hair bg-surface rounded-card flex items-center gap-4 border p-4">
      <span
        class="brand-gradient flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white"
        aria-hidden="true"
      >
        <template v-if="initial">{{ initial }}</template>
        <UserRound v-else class="size-6" />
      </span>

      <div class="min-w-0 flex-1">
        <p class="text-ink truncate text-base font-semibold">
          {{ displayName.trim() || email || $t('profile.notSignedIn') }}
        </p>
        <p v-if="displayName.trim() && email" class="text-ink-soft truncate text-xs">
          {{ email }}
        </p>
        <p v-if="memberSince" class="text-ink-soft mt-1 text-xs">
          {{ $t('profile.trackingSince', { date: memberSince }) }}
        </p>
      </div>
    </section>

    <InstallPrompt />

    <div class="flex gap-2">
      <StatCard :value="String(transactionCount ?? 0)" :label="$t('profile.entries')" />
      <StatCard :value="String(categories?.length ?? 0)" :label="$t('profile.categories')" />
    </div>

    <SettingsGroup :title="$t('profile.account')">
      <SettingsRow
        :label="$t('profile.displayName')"
        :description="$t('profile.displayNameHint')"
        stacked
      >
        <BaseInput
          v-model="displayName"
          :label="$t('profile.displayName')"
          :placeholder="$t('profile.displayNamePlaceholder')"
          label-hidden
        />
      </SettingsRow>
    </SettingsGroup>

    <SettingsGroup :title="$t('category.title')">
      <SettingsRow
        :label="$t('category.manage')"
        :description="$t('category.manageBody')"
        interactive
        @click="router.push('/settings')"
      />
    </SettingsGroup>
  </div>
</template>
