import { Card } from '@astryxdesign/core/Card'
import { Text } from '@astryxdesign/core/Text'
import { Gamepad2, UsersRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import localArt from '../assets/local.png'
import multiplayerArt from '../assets/multiplayer.png'

const PlayPage = () => {
  const { t } = useTranslation()

  return <section className="mx-auto max-w-3xl space-y-7">
    <header className="space-y-2">
      <h1 className="text-3xl font-bold">{t('play.title')}</h1>
    </header>
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="mode-action-card p-0" padding={0}>
        <Link to="/setup" className="mode-action-card__link flex min-h-44 flex-col justify-between gap-6 p-5 outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]">
          <img className="mode-action-card__art" src={localArt} alt="" aria-hidden="true" />
          <Gamepad2 size={28} aria-hidden="true" className="relative z-10 text-[var(--color-accent)]" />
          <div className="relative z-10 space-y-2"><h2 className="text-xl font-bold">{t('play.localTitle')}</h2><Text as="p" type="supporting">{t('play.localDescription')}</Text></div>
        </Link>
      </Card>
      <Card className="mode-action-card p-0" padding={0}>
        <Link to="/lobby" className="mode-action-card__link flex min-h-44 flex-col justify-between gap-6 p-5 outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]">
          <img className="mode-action-card__art" src={multiplayerArt} alt="" aria-hidden="true" />
          <UsersRound size={28} aria-hidden="true" className="relative z-10 text-[var(--color-accent)]" />
          <div className="relative z-10 space-y-2"><h2 className="text-xl font-bold">{t('play.multiplayerTitle')}</h2><Text as="p" type="supporting">{t('play.multiplayerDescription')}</Text></div>
        </Link>
      </Card>
    </div>
  </section>
}

export default PlayPage
