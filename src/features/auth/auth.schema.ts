import { z } from 'zod'

import { t } from '@/shared/i18n'

/**
 * Built on call, not at module load.
 *
 * Zod bakes its messages in at construction, so a schema created once at import
 * time would keep whichever language was active when the bundle started.
 */
export function loginSchema() {
  return z.object({
    email: z.string().email(t('validation.emailInvalid')),
    password: z.string().min(8, t('validation.passwordMin')),
  })
}

export function signupSchema() {
  return loginSchema()
    .extend({ confirmPassword: z.string() })
    .refine((values) => values.password === values.confirmPassword, {
      message: t('validation.passwordsMismatch'),
      path: ['confirmPassword'],
    })
}

export type LoginValues = z.infer<ReturnType<typeof loginSchema>>
export type SignupValues = z.infer<ReturnType<typeof signupSchema>>
