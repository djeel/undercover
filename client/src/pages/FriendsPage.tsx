import type { FriendshipView, ProfileView } from '@undercover/shared'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { api } from '../lib/api-client'
import { useGameStore } from '../features/game/game-store'

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unable to update friends.'

export default function FriendsPage() {
  const { t } = useTranslation()
  const [friends, setFriends] = useState<FriendshipView[]>([])
  const [matches, setMatches] = useState<ProfileView[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const game = useGameStore((state) => state.game)
  const playerId = useGameStore((state) => state.playerId)
  const canInvite = game?.phase === 'lobby' && game.hostPlayerId === playerId

  useEffect(() => {
    let alive = true
    void api.getFriends().then((next) => { if (alive) setFriends(next) }).catch((cause: unknown) => { if (alive) setError(errorMessage(cause)) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setMatches([])
      return
    }
    let alive = true
    const timeout = window.setTimeout(() => {
      void api.searchProfiles(query.trim()).then((next) => { if (alive) setMatches(next) }).catch((cause: unknown) => { if (alive) setError(errorMessage(cause)) })
    }, 300)
    return () => { alive = false; window.clearTimeout(timeout) }
  }, [query])

  const act = async (profileId: string, action: (id: string) => Promise<unknown>) => {
    setWorkingId(profileId)
    setError(null)
    try {
      await action(profileId)
      setFriends(await api.getFriends())
      setMatches([])
      setQuery('')
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setWorkingId(null)
    }
  }

  const inviteHref = game ? `/lobby?code=${encodeURIComponent(game.roomCode)}` : '/lobby'
  const relationship = (profile: ProfileView) => friends.find((friend) => friend.profileId === profile.id)
  const incoming = friends.filter((friend) => friend.status === 'pending' && friend.requestedBy === friend.profileId)
  const outgoing = friends.filter((friend) => friend.status === 'pending' && friend.requestedBy !== friend.profileId)
  const accepted = friends.filter((friend) => friend.status === 'accepted')

  return <section className="mx-auto max-w-3xl space-y-7"><header><h1 className="text-3xl font-bold">{t('friends.title')}</h1><p className="text-[var(--color-text-secondary)]">{t('friends.subtitle')}</p></header><Card><div className="space-y-4 p-5"><TextInput label={t('friends.searchLabel')} value={query} onChange={setQuery} placeholder={t('friends.searchPlaceholder')} width="100%" />{query.trim().length === 1 && <p className="text-sm text-[var(--color-text-secondary)]">{t('friends.searchMinimum')}</p>}{matches.map((profile) => <div key={profile.id} className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] py-3"><div><strong>{profile.displayName}</strong><span className="ml-2 text-sm text-[var(--color-text-secondary)]">@{profile.handle}</span></div>{relationship(profile) ? <span className="text-sm">{relationship(profile)?.status}</span> : <Button variant="secondary" label={t('friends.add')} isLoading={workingId === profile.id} onClick={() => void act(profile.id, api.requestFriend)} />}</div>)}</div></Card>{error && <p role="alert" className="text-[var(--color-text-danger)]">{error}</p>}{loading ? <p role="status">{t('common.loading')}</p> : <div className="space-y-5"><FriendGroup title={t('friends.incoming')} rows={incoming} empty={t('friends.emptyIncoming')} actions={(friend) => <><Button variant="primary" label={t('friends.accept')} isLoading={workingId === friend.profileId} onClick={() => void act(friend.profileId, api.acceptFriend)} /><Button variant="secondary" label={t('friends.decline')} isDisabled={workingId === friend.profileId} onClick={() => void act(friend.profileId, api.deleteFriend)} /></>} /><FriendGroup title={t('friends.outgoing')} rows={outgoing} empty={t('friends.emptyOutgoing')} actions={(friend) => <Button variant="secondary" label={t('friends.cancel')} isLoading={workingId === friend.profileId} onClick={() => void act(friend.profileId, api.deleteFriend)} />} /><FriendGroup title={t('friends.accepted')} rows={accepted} empty={t('friends.emptyAccepted')} actions={(friend) => <><Button variant="secondary" label={t('friends.remove')} isLoading={workingId === friend.profileId} onClick={() => void act(friend.profileId, api.deleteFriend)} />{canInvite && <Link className="text-sm font-semibold text-[var(--color-accent)]" to={inviteHref}>{t('friends.invite')}</Link>}</>} /></div>}</section>
}

function FriendGroup({ title, rows, empty, actions }: { title: string; rows: FriendshipView[]; empty: string; actions: (friend: FriendshipView) => React.ReactNode }) {
  return <Card><div className="p-5"><h2 className="text-lg font-bold">{title}</h2>{rows.length === 0 ? <p className="mt-3 text-[var(--color-text-secondary)]">{empty}</p> : <ul className="mt-3 divide-y divide-[var(--color-border)]">{rows.map((friend) => <li className="flex items-center justify-between gap-3 py-3" key={friend.profileId}><div><strong>{friend.profile?.displayName ?? friend.profileId}</strong>{friend.profile && <span className="ml-2 text-sm text-[var(--color-text-secondary)]">@{friend.profile.handle}</span>}</div><div className="flex flex-wrap justify-end gap-2">{actions(friend)}</div></li>)}</ul>}</div></Card>
}
