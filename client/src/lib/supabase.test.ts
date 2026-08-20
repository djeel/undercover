import { describe, expect, it } from 'vitest'

import { getSupabaseConfigurationError } from './supabase'

describe('getSupabaseConfigurationError', () => {
  it('returns a localizable key when either required public variable is missing', () => {
    expect(getSupabaseConfigurationError({ VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' })).toBe('auth.configurationError')
  })
  it('accepts a complete public configuration', () => {
    expect(
      getSupabaseConfigurationError({
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
      }),
    ).toBeNull()
  })
})
