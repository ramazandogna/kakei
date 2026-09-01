import type { MessageSchema } from './index'

/**
 * Teaches `$t` and `t` the real key set, so a typo is a compile error instead
 * of a raw key rendered on screen.
 *
 * The interface has no members of its own by design — module augmentation only
 * works through `extends` here, which is what the lint rule below cannot see.
 */
declare module 'vue-i18n' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefineLocaleMessage extends MessageSchema {}
}

export {}
