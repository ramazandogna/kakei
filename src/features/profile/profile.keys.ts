/** There is only ever one profile per session, so a flat key is enough. */
export const profileKeys = {
  all: ['profile'] as const,
  current: () => [...profileKeys.all, 'current'] as const,
}
