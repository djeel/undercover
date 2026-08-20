import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from './AuthProvider'

export function RequireSession({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { isLoading, isAnonymous, configurationError } = useAuth()
  const location = useLocation()

  if (configurationError || isLoading) return <p role="status">{configurationError ? t(configurationError) : t('common.loading')}</p>
  if (isAnonymous) return <Navigate to="/auth" replace state={{ returnPath: `${location.pathname}${location.search}` }} />
  return children
}
