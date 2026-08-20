import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Text } from '@astryxdesign/core/Text'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { getSafeReturnPath } from './auth-url'
import { useAuth } from './AuthProvider'

export function AuthPage() {
  const { t } = useTranslation()
  const { signInWithOAuth, error, configurationError, isLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const returnPath = getSafeReturnPath((location.state as { returnPath?: string } | null)?.returnPath)

  if (configurationError) return <section><h1>{t('auth.unavailable')}</h1><p role="alert">{t(configurationError)}</p></section>

  return <section className="mx-auto max-w-md space-y-6"><header className="space-y-2"><h1 className="text-3xl font-bold">{t('auth.title')}</h1><Text as="p" type="supporting">{t('auth.subtitle')}</Text></header><Card><div className="space-y-3 p-5"><Button variant="primary" label={t('auth.continueGoogle')} isLoading={isLoading} onClick={() => void signInWithOAuth('google', returnPath)} width="100%" /><Button variant="secondary" label={t('auth.continueDiscord')} isLoading={isLoading} onClick={() => void signInWithOAuth('discord', returnPath)} width="100%" /><Button variant="secondary" label={t('auth.continueAnonymous')} onClick={() => navigate(returnPath)} width="100%" />{error && <p role="alert" className="text-[var(--color-text-danger)]">{t(error, { defaultValue: error })}</p>}</div></Card></section>
}
