import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import { getProfile, updateProfile } from './profile.api'
import { profileKeys } from './profile.keys'

/**
 * Vue bindings for the profile.
 *
 * `staleTime: Infinity` because preferences only change when this app changes
 * them, and every mutation writes the fresh row straight back into the cache.
 */
export function useProfile(enabled?: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: profileKeys.current(),
    queryFn: getProfile,
    staleTime: Infinity,
    ...(enabled === undefined ? {} : { enabled: computed(() => toValue(enabled)) }),
  })
}

/** Saves preferences and puts the returned row in the cache — no refetch. */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => queryClient.setQueryData(profileKeys.current(), profile),
  })
}

/**
 * The day of the month the user's accounting period starts on.
 *
 * Clamped rather than trusted: the column is a `smallint` and every total in
 * the app is derived from this, so a value outside 1-28 has to become 1 rather
 * than shift a month by a week.
 */
export function useMonthStartDay() {
  const { data } = useProfile()

  return computed<number>(() => {
    const day = data.value?.month_start_day ?? 1

    return day >= 1 && day <= 28 ? day : 1
  })
}
