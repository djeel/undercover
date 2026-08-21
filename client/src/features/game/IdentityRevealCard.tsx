import { useTranslation } from 'react-i18next'
import type { PlayerRole } from '@undercover/shared'
import civilianArt from '../../assets/roles/civilians.png'
import undercoverArt from '../../assets/roles/undercover.png'
import mrWhiteArt from '../../assets/roles/mrwhite.png'
import jesterArt from '../../assets/roles/jester.png'
import bodyguardArt from '../../assets/roles/bodyguard.png'
import cardBackArt from '../../assets/roles/card.png'
import { RoleRevealCard } from './RoleRevealCard'

export interface PrivateIdentity {
  role: PlayerRole
  word: string | null
  bodyguardTargetName?: string
}

export interface IdentityRevealCardProps {
  active: boolean
  identity: PrivateIdentity
  onReveal?: () => void
}

const roleKey: Record<PlayerRole, string> = {
  civilian: 'roles.civilian',
  undercover: 'roles.undercover',
  mr_white: 'roles.mrWhite',
  jester: 'roles.jester',
  bodyguard: 'roles.bodyguard',
}

const roleArt: Record<PlayerRole, string> = {
  civilian: civilianArt,
  undercover: undercoverArt,
  mr_white: mrWhiteArt,
  jester: jesterArt,
  bodyguard: bodyguardArt,
}

export function IdentityRevealCard({ active, identity, onReveal }: IdentityRevealCardProps) {
  const { t } = useTranslation()

  return (
    <RoleRevealCard
      open={active}
      identity={identity}
      roleLabel={t(roleKey[identity.role])}
      roleArt={roleArt[identity.role]}
      cardBackArt={cardBackArt}
      roleLabelCaption={t('identity.role', 'Role')}
      wordLabelCaption={t('identity.word', 'Word')}
      noWordLabel={t('identity.noWord', 'No word')}
      revealLabel={t('identity.revealCard')}
      holdLabel={t('identity.holdCard')}
      memorizeLabel={t('identity.memorize')}
      protectLabel={(name) => t('identity.protect', 'Protect {{name}}', { name })}
      onReveal={onReveal}
    />
  )
}
