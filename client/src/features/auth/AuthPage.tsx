import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Text } from '@astryxdesign/core/Text'
import { Chrome, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { getSafeReturnPath } from './auth-url'
import { useAuth } from './AuthProvider'

export function AuthPage() {
  const { t } = useTranslation()
  const { signInWithOAuth, error, configurationError, isAuthenticating } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const returnPath = getSafeReturnPath((location.state as { returnPath?: string } | null)?.returnPath)

  if (configurationError) return <section><h1>{t('auth.unavailable')}</h1><p role="alert">{t(configurationError)}</p></section>

  return <main className="auth-page"><section className="auth-page__content"><header className="space-y-3 text-center"><h1 className="text-3xl font-bold">{t('auth.title')}</h1><Text as="p" type="supporting">{t('auth.subtitle')}</Text></header><Card><div className="space-y-3 p-5"><Button variant="primary" icon={<Chrome aria-hidden="true" />} label={t('auth.continueGoogle')} isLoading={isAuthenticating} onClick={() => void signInWithOAuth('google', returnPath)} width="100%" /><Button variant="secondary" icon={<MessageCircle aria-hidden="true" />} label={t('auth.continueDiscord')} isLoading={isAuthenticating} onClick={() => void signInWithOAuth('discord', returnPath)} width="100%" /><div className="auth-page__separator" aria-hidden="true"><span>{t('auth.or')}</span></div><Button variant="ghost" label={t('auth.continueAnonymous')} onClick={() => navigate(returnPath)} width="100%" />{error && <p role="alert" className="text-[var(--color-text-danger)]">{t(error, { defaultValue: error })}</p>}</div></Card></section></main>
}
