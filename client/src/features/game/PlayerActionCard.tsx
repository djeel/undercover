import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import { useTranslation } from 'react-i18next'

export interface PlayerActionCardProps {
  playerId: string
  displayName: string
  alive: boolean
  expanded: boolean
  confirmationPending: boolean
  onToggle(): void
  onViewRole(): void
  onVote(): void
}

export function PlayerActionCard({ playerId, displayName, alive, expanded, confirmationPending, onToggle, onViewRole, onVote }: PlayerActionCardProps) {
  const { t } = useTranslation()
  const actionsId = `player-actions-${playerId}`

  return (
    <article className={`player-action-card${expanded ? ' is-expanded' : ''}${alive ? '' : ' is-eliminated'}`}>
      <button
        type="button"
        className="player-action-card__trigger"
        disabled={!alive || confirmationPending}
        aria-expanded={alive ? expanded : false}
        aria-controls={alive ? actionsId : undefined}
        onClick={onToggle}
      >
        <span className={alive ? '' : 'line-through'}>{displayName}</span>
        <Text as="span" type="supporting">{alive ? t('game.alive') : t('game.eliminated')}</Text>
      </button>
      {alive && expanded ? (
        <div id={actionsId} className="player-action-card__actions">
          <Button className="player-action-card__view-role" variant="secondary" label={t('game.viewRole')} onClick={onViewRole} width="100%" />
          <Button className="player-action-card__vote" variant="destructive" label={t('game.voteFor')} onClick={onVote} width="100%" />
        </div>
      ) : null}
    </article>
  )
}
