import { describe, expect, it } from 'vitest'

import { getCallbackError, getOAuthCallbackUrl, getSafeReturnPath, isNativeOAuthCallback } from './auth-url'

describe('getSafeReturnPath', () => {
  it('keeps an internal application route', () => {
    expect(getSafeReturnPath('/friends?tab=pending')).toBe('/friends?tab=pending')
  })

  it('rejects external and protocol-relative redirects', () => {
    expect(getSafeReturnPath('https://attacker.example')).toBe('/')
    expect(getSafeReturnPath('//attacker.example')).toBe('/')
  })
})

describe('getOAuthCallbackUrl', () => {
  it('builds the callback from the active origin and router base', () => {
    expect(getOAuthCallbackUrl('https://djeel.github.io', '/undercover/')).toBe(
      'https://djeel.github.io/undercover/auth/callback',
    )
  })

  it('uses the Android callback scheme for native OAuth', () => {
    expect(getOAuthCallbackUrl('https://djeel.github.io', '/undercover/', true)).toBe(
      'com.djeel.undercover://auth/callback',
    )
  })
})

describe('isNativeOAuthCallback', () => {
  it('accepts only the configured Android callback endpoint', () => {
    expect(isNativeOAuthCallback('com.djeel.undercover://auth/callback?code=abc')).toBe(true)
    expect(isNativeOAuthCallback('com.djeel.undercover://auth/callback/other?code=abc')).toBe(false)
    expect(isNativeOAuthCallback('com.djeel.undercover://other/callback?code=abc')).toBe(false)
  })
})

describe('getCallbackError', () => {
  it('reads a provider callback failure without treating it as a successful session', () => {
    expect(getCallbackError('https://app.example/auth/callback?error=access_denied&error_description=The%20player%20cancelled')).toBe(
      'The player cancelled',
    )
  })
})


describe('getCallbackError fragments', () => {
  it('reads a provider callback failure from a URL fragment', () => {
    expect(getCallbackError('com.djeel.undercover://auth/callback#error=access_denied&error_description=The%20player%20cancelled')).toBe(
      'The player cancelled',
    )
  })
})
