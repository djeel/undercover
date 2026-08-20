import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useAuth } from './AuthProvider'

export function AuthCallbackPage() {
  const { t } = useTranslation()
  const { completeCallback, configurationError } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(configurationError)

  useEffect(() => {
    if (configurationError) return
    void completeCallback(window.location.href).then((destination) => navigate(destination, { replace: true })).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'auth.callbackFailure')
    })
  }, [completeCallback, configurationError, navigate])

  return <section aria-live="polite"><h1>{t('auth.callbackTitle')}</h1>{error ? <p role="alert">{t(error, { defaultValue: error })}</p> : <p>{t('auth.callbackLoading')}</p>}</section>
}
