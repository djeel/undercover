import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import type { Provider, Session, User } from '@supabase/supabase-js'
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { api, configureApiTokenProvider } from '../../lib/api-client'
import { realtimeForGame, useGameStore } from '../game/game-store'
import { supabase, supabaseConfigurationError } from '../../lib/supabase'
import { getCallbackError, getOAuthCallbackUrl, getSafeReturnPath, isNativeOAuthCallback } from './auth-url'

export type AuthState = {
  session: Session | null
  user: User | null
  isLoading: boolean
  error: string | null
  configurationError: string | null
  isAnonymous: boolean
  signInWithOAuth(provider: 'google' | 'discord', returnPath?: string): Promise<void>
  completeCallback(url: string): Promise<string>
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

const readToken = async () => {
  const { data } = await supabase!.auth.getSession()
  return data.session?.access_token ?? null
}

const getCallbackUrl = () => getOAuthCallbackUrl(window.location.origin, import.meta.env.BASE_URL, Capacitor.isNativePlatform())

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    const client = supabase

    configureApiTokenProvider(readToken)
    let active = true
    const initialize = async () => {
      const { data, error: sessionError } = await client.auth.getSession()
      if (sessionError) {
        if (active) setError(sessionError.message)
      } else if (data.session) {
        if (active) setSession(data.session)
      } else {
        const { data: anonymous, error: anonymousError } = await client.auth.signInAnonymously()
        if (active) {
          setSession(anonymous.session)
          setError(anonymousError?.message ?? null)
        }
      }
      if (active) setLoading(false)
    }
    void initialize()
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (nextSession) useGameStore.getState().startRealtime(realtimeForGame(client.realtime, api))
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !supabase) return
    const client = supabase
    const handleNativeCallback = async (url: string) => {
      if (!isNativeOAuthCallback(url)) return
      const oauthError = getCallbackError(url)
      if (oauthError) {
        setError(oauthError)
        await Browser.close()
        window.location.hash = '/auth'
        return
      }
      const code = new URL(url).searchParams.get('code')
      if (!code) {
        setError('auth.callbackCodeMissing')
        await Browser.close()
        window.location.hash = '/auth'
        return
      }
      const { error: exchangeError } = await client.auth.exchangeCodeForSession(code)
      setError(exchangeError?.message ?? null)
      await Browser.close()
      window.location.hash = exchangeError
        ? '/auth'
        : getSafeReturnPath(sessionStorage.getItem('undercover.auth.returnPath'))
    }
    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) void handleNativeCallback(launch.url)
    })
    const listener = App.addListener('appUrlOpen', ({ url }) => { void handleNativeCallback(url) })
    return () => {
      void listener.then((handle) => handle.remove())
    }
  }, [])

  const completeCallback = useCallback(async (url: string) => {
    if (!supabase) return '/'
    const callback = new URL(url, window.location.origin)
    const oauthError = getCallbackError(callback.toString())
    if (oauthError) {
      setError(oauthError)
      return '/auth'
    }
    const code = callback.searchParams.get('code')
    if (!code) {
      setError('auth.callbackCodeMissing')
      return '/auth'
    }
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      setError(exchangeError.message)
      return '/auth'
    }
    setError(null)
    return getSafeReturnPath(sessionStorage.getItem('undercover.auth.returnPath'))
  }, [])

  const signInWithOAuth = useCallback(async (provider: Provider, returnPath = '/') => {
    if (!supabase) return
    const safeReturnPath = getSafeReturnPath(returnPath)
    sessionStorage.setItem('undercover.auth.returnPath', safeReturnPath)
    const options = { redirectTo: getCallbackUrl(), skipBrowserRedirect: Capacitor.isNativePlatform() }
    const response = session?.user.is_anonymous
      ? await supabase.auth.linkIdentity({ provider, options })
      : await supabase.auth.signInWithOAuth({ provider, options })
    const { data, error: oauthError } = response
    if (oauthError) {
      setError(oauthError.message)
      return
    }
    if (Capacitor.isNativePlatform() && data.url) await Browser.open({ url: data.url })
  }, [session?.user.is_anonymous])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await useGameStore.getState().stopRealtime()
    useGameStore.getState().clear()
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError(signOutError.message)
      return
    }
    const { data, error: anonymousError } = await supabase.auth.signInAnonymously()
    setSession(data.session)
    setError(anonymousError?.message ?? null)
  }, [])

  const value = useMemo<AuthState>(() => ({
    session,
    user: session?.user ?? null,
    isLoading,
    error,
    configurationError: supabaseConfigurationError,
    isAnonymous: session?.user.is_anonymous ?? true,
    signInWithOAuth,
    completeCallback,
    signOut,
  }), [session, isLoading, error, signInWithOAuth, completeCallback, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
