import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createSupabaseClient } from 'rei-kit/supabase'

/**
 * The build replaces Supabase's realtime, storage and functions modules with an
 * inert stub (build/supabase-unused.js), because this app calls none of them and
 * they cost 86 kB on the critical path.
 *
 * The risk that buys is narrow but real: supabase-js reaches into those modules
 * itself -- `realtime.setAuth(token)` on every refresh -- and a version bump
 * could add a call the stub does not answer. Nothing would fail at build time.
 * So this exercises the client through the stub, which vitest resolves through
 * the same alias the build uses.
 */

const client = createSupabaseClient('https://example.supabase.co', 'anon-key')

describe('the Supabase client with the unused modules stubbed', () => {
  it('still builds queries', () => {
    const query = client.from('transactions').select('*').eq('id', 'x')

    // A builder, not a request: nothing is sent until it is awaited.
    expect(typeof query.then).toBe('function')
  })

  it('still answers for auth', async () => {
    const { data, error } = await client.auth.getSession()

    expect(error).toBeNull()
    expect(data.session).toBeNull()
  })

  it('survives the paths supabase-js drives into the stubbed modules', () => {
    // These are what the library itself touches on sign-in, refresh and
    // sign-out. Each must return rather than throw.
    expect(() => client.realtime.setAuth('token')).not.toThrow()
    expect(() => client.channel('any')).not.toThrow()
    expect(() => client.getChannels()).not.toThrow()
    expect(() => client.removeAllChannels()).not.toThrow()
  })

  it('leaves the app-facing surfaces reachable', () => {
    expect(client.storage).toBeDefined()
    expect(client.functions).toBeDefined()
  })
})

describe('the build wiring', () => {
  // vitest runs from the project root, which is where the config lives.
  const config = readFileSync('vite.config.ts', 'utf8')

  it.each(['realtime-js', 'storage-js', 'functions-js'])('aliases @supabase/%s away', (name) => {
    // Without the alias the tests above still pass -- against the real modules.
    // This is what keeps the saving from quietly disappearing.
    expect(config).toContain(name)
  })
})
