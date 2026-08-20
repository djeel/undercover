import { createClient } from '@supabase/supabase-js'

export type PublicEnvironment = {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

export const getSupabaseConfigurationError = (environment: PublicEnvironment) => {
  if (!environment.VITE_SUPABASE_URL?.trim() || !environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()) {
    return 'auth.configurationError'
  }
  return null
}

const configurationError = getSupabaseConfigurationError({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
})

export const supabaseConfigurationError = configurationError

export const supabase = configurationError
  ? null
  : createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
