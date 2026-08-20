import { Card } from '@astryxdesign/core/Card'
import { Text } from '@astryxdesign/core/Text'
import { Settings, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import profileArt from '../assets/profile.png'
import settingsArt from '../assets/settings.png'

const AccountPage = () => {
  const { t } = useTranslation()

  return <section className="mx-auto max-w-3xl space-y-7">
    <header className="space-y-2">
      <h1 className="text-3xl font-bold">{t('account.title')}</h1>
    </header>
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="mode-action-card p-0" padding={0}>
        <Link to="/profile" className="mode-action-card__link flex min-h-44 flex-col justify-between gap-6 p-5 outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]">
          <img className="mode-action-card__art" src={profileArt} alt="" aria-hidden="true" />
          <UserRound size={28} aria-hidden="true" className="relative z-10 text-[var(--color-accent)]" />
          <div className="relative z-10 space-y-2"><h2 className="text-xl font-bold">{t('account.profileTitle')}</h2><Text as="p" type="supporting">{t('account.profileDescription')}</Text></div>
        </Link>
      </Card>
      <Card className="mode-action-card p-0" padding={0}>
        <Link to="/settings" className="mode-action-card__link flex min-h-44 flex-col justify-between gap-6 p-5 outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]">
          <img className="mode-action-card__art" src={settingsArt} alt="" aria-hidden="true" />
          <Settings size={28} aria-hidden="true" className="relative z-10 text-[var(--color-accent)]" />
          <div className="relative z-10 space-y-2"><h2 className="text-xl font-bold">{t('account.settingsTitle')}</h2><Text as="p" type="supporting">{t('account.settingsDescription')}</Text></div>
        </Link>
      </Card>
    </div>
  </section>
}

export default AccountPage
