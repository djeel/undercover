const nativeOAuthCallback = 'com.djeel.undercover://auth/callback'

export const getSafeReturnPath = (value: string | null | undefined) => {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/'
  return value
}

export const getOAuthCallbackUrl = (origin: string, base: string, native = false) => {
  if (native) return nativeOAuthCallback
  const normalizedBase = `/${base.replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '')
  return new URL(`${normalizedBase}/auth/callback`, origin).toString()
}

export const isNativeOAuthCallback = (value: string) => {
  const callback = new URL(value)
  return `${callback.protocol}//${callback.host}${callback.pathname}` === nativeOAuthCallback
}

export const getCallbackError = (value: string) => {
  const url = new URL(value)
  const parameters = new URLSearchParams(url.search || url.hash.slice(1))
  return parameters.get('error_description') ?? parameters.get('error')
}
