import type { PlayerStatsView, ProfileView } from '@undercover/shared'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { api } from '../lib/api-client'
import { useAuth } from '../features/auth'

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unable to load profile.'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const [profile, setProfile] = useState<ProfileView | null>(null)
  const [stats, setStats] = useState<PlayerStatsView | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void Promise.all([api.getProfile(), api.getStats()]).then(([nextProfile, nextStats]) => {
      if (!alive) return
      setProfile(nextProfile); setStats(nextStats); setDisplayName(nextProfile.displayName); setHandle(nextProfile.handle)
    }).catch((cause: unknown) => { if (alive) setError(errorMessage(cause)) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const save = async () => {
    setSaving(true); setError(null)
    try {
      const next = await api.updateProfile({ displayName: displayName.trim(), handle: handle.trim() })
      setProfile(next); setDisplayName(next.displayName); setHandle(next.handle)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p role="status">{t('common.loading')}</p>
  if (!profile || !stats) return <p role="alert">{error ?? t('common.error')}</p>
  const winRate = stats.gamesPlayed === 0 ? 0 : Math.round((stats.gamesWon / stats.gamesPlayed) * 100)

  return <section className="mx-auto max-w-4xl space-y-7"><header className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-background-muted)] text-xl font-bold">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : profile.displayName.slice(0, 1).toUpperCase()}</div><div><h1 className="text-3xl font-bold">{t('profile.title')}</h1><p className="text-[var(--color-text-secondary)]">@{profile.handle}</p></div></header>{error && <p role="alert" className="text-[var(--color-text-danger)]">{error}</p>}<Card><form className="space-y-4 p-5" onSubmit={(event) => { event.preventDefault(); void save() }}><h2 className="text-lg font-bold">{t('profile.identity')}</h2><TextInput label={t('profile.displayName')} value={displayName} onChange={setDisplayName} width="100%" /><TextInput label={t('profile.handle')} value={handle} onChange={setHandle} width="100%" /><Button variant="primary" label={t('profile.save')} isLoading={saving} width="100%" /></form></Card><dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-container)] bg-[var(--color-border)] sm:grid-cols-3"><Metric label={t('profile.played')} value={stats.gamesPlayed} /><Metric label={t('profile.won')} value={stats.gamesWon} /><Metric label={t('profile.lost')} value={stats.gamesLost} /><Metric label={t('profile.winRate')} value={`${winRate}%`} /><Metric label={t('profile.currentStreak')} value={stats.currentWinStreak} /><Metric label={t('profile.bestStreak')} value={stats.bestWinStreak} /></dl><Card><div className="overflow-x-auto p-5"><h2 className="text-lg font-bold">{t('profile.byRole')}</h2><table className="mt-3 w-full text-left"><thead><tr><th>{t('profile.role')}</th><th>{t('profile.played')}</th><th>{t('profile.won')}</th></tr></thead><tbody>{stats.roles.map((role) => <tr className="border-t border-[var(--color-border)]" key={role.role}><td className="py-2">{role.role}</td><td>{role.gamesPlayed}</td><td>{role.wins}</td></tr>)}</tbody></table></div></Card><Card><div className="overflow-x-auto p-5"><h2 className="text-lg font-bold">{t('profile.recent')}</h2>{stats.results.length === 0 ? <p className="mt-3 text-[var(--color-text-secondary)]">{t('profile.emptyResults')}</p> : <table className="mt-3 w-full text-left"><thead><tr><th>{t('profile.role')}</th><th>{t('profile.outcome')}</th><th>{t('profile.played')}</th></tr></thead><tbody>{stats.results.slice(0, 20).map((result) => <tr className="border-t border-[var(--color-border)]" key={`${result.playedAt}-${result.role}`}><td className="py-2">{result.role}</td><td>{result.won ? t('profile.victory') : t('profile.defeat')}</td><td>{new Date(result.playedAt).toLocaleDateString()}</td></tr>)}</tbody></table>}</div></Card><Button variant="secondary" label={t('profile.signOut')} onClick={() => void signOut()} /></section>
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="bg-[var(--color-background-surface)] p-4"><dt className="text-sm text-[var(--color-text-secondary)]">{label}</dt><dd className="mt-1 text-2xl font-bold">{value}</dd></div>
}
