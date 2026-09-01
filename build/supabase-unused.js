/**
 * Stands in for the Supabase features this app does not use.
 *
 * `@supabase/supabase-js` is an umbrella: importing it pulls realtime (and its
 * phoenix dependency), storage and functions into the bundle whether or not a
 * line of code ever touches them. Kakei touches none of the three -- it reads
 * and writes rows and signs people in -- and they cost 106 kB raw, 25 kB gzip,
 * on the critical path, since auth is needed before the first screen.
 *
 * Aliasing them here rather than assembling a client out of `postgrest-js` and
 * `auth-js` by hand is the conservative choice: every line of Supabase's own
 * auth handling, including keeping the access token on the PostgREST headers,
 * stays exactly as shipped. Only three modules nothing calls become inert.
 *
 * Every export answers any property with another inert callable, so an internal
 * call that a future version of supabase-js adds -- `realtime.setAuth(token)`
 * on refresh is the one that exists today -- returns quietly instead of
 * throwing in production. `src/shared/lib/__tests__/supabase-client.spec.ts`
 * exercises the client through this stub.
 */

const inert = () =>
  new Proxy(function inert() {}, {
    // Symbols are left alone: `instanceof`, `await` and string coercion must
    // behave normally rather than being answered with a function.
    get: (target, key) => (typeof key === 'symbol' ? Reflect.get(target, key) : inert()),
    apply: () => inert(),
    construct: () => inert(),
  })

export const RealtimeClient = inert()
export const RealtimeChannel = inert()
export const RealtimePresence = inert()
export const REALTIME_LISTEN_TYPES = inert()
export const REALTIME_POSTGRES_CHANGES_LISTEN_EVENT = inert()
export const REALTIME_SUBSCRIBE_STATES = inert()
export const REALTIME_CHANNEL_STATES = inert()
export const REALTIME_PRESENCE_LISTEN_EVENTS = inert()

export const StorageClient = inert()
export const StorageError = inert()
export const StorageApiError = inert()
export const StorageUnknownError = inert()
export const isStorageError = () => false

export const FunctionsClient = inert()
export const FunctionRegion = inert()
export const FunctionsError = inert()
export const FunctionsFetchError = inert()
export const FunctionsHttpError = inert()
export const FunctionsRelayError = inert()

export default inert()
