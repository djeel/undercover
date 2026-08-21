import { Card } from '@astryxdesign/core/Card'
import { Text } from '@astryxdesign/core/Text'
import { Clock3, Play, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { FriendshipView, PlayerResultView, PlayerStatsView } from '@undercover/shared'

import { useAuth } from '../features/auth'
import { getDashboardState } from '../features/dashboard/dashboard-state'
import { useGameStore } from '../features/game/game-store'
import { useLocalGameStore } from '../features/local-game/local-game-store'
import { api } from '../lib/api-client'
import localArt from '../assets/local.png'

const HomePage = () => {

  const { t } = useTranslation()
  const { isAnonymous, isLoading, user } = useAuth()
  const onlineGame = useGameStore((state) => state.game)
  const localPhase = useLocalGameStore((state) => state.phase)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [friends, setFriends] = useState<FriendshipView[]>([])
  const [stats, setStats] = useState<PlayerStatsView | null>(null)
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [friendsError, setFriendsError] = useState(false)
  const [statsError, setStatsError] = useState(false)
  const [dashboardDataUserId, setDashboardDataUserId] = useState<string | null>(null)
  const userId = isAnonymous ? null : user?.id ?? null
  const hasCurrentDashboardData = dashboardDataUserId === userId
  const currentFriends = hasCurrentDashboardData ? friends : []
  const currentStats = hasCurrentDashboardData ? stats : null

  useEffect(() => {
    if (!localStorage.getItem('hasSeenTutorial') || searchParams.get('tutorial')) navigate('/onboarding')
  }, [navigate, searchParams])

  useEffect(() => {
    if (isAnonymous || !userId) {
      setDashboardDataUserId(null)
      setFriends([])
      setStats(null)
      setFriendsLoading(false)
      setStatsLoading(false)
      setFriendsError(false)
      setStatsError(false)
      return
    }
    if (isLoading) return

    let active = true
    setDashboardDataUserId(userId)
    setFriends([])
    setStats(null)
    setFriendsLoading(true)
    setStatsLoading(true)
    setFriendsError(false)
    setStatsError(false)

    void api.getFriends()
      .then((next) => { if (active) setFriends(next) })
      .catch(() => { if (active) setFriendsError(true) })
      .finally(() => { if (active) setFriendsLoading(false) })
    void api.getStats()
      .then((next) => { if (active) setStats(next) })
      .catch(() => { if (active) setStatsError(true) })
      .finally(() => { if (active) setStatsLoading(false) })

    return () => { active = false }
  }, [isAnonymous, isLoading, userId])

  const dashboard = getDashboardState({ isAnonymous, friends: currentFriends, stats: currentStats, onlineGame, localPhase })

  return <section className="dashboard space-y-6">
    <header className="dashboard-intro max-w-2xl space-y-3">
      <h1 className="text-4xl font-bold tracking-tight">{t('app.title')}</h1>
      <Text as="p" type="large" color="secondary">{t('home.subtitle')}</Text>
    </header>
    <section className="primary-action-card" aria-labelledby="local-play-title">
      <Link className="primary-action-card__link" to="/setup">
        <img className="action-card__art" src={localArt} alt="" aria-hidden="true" />
        <div className="primary-action-card__shapes" aria-hidden="true" />
        <div className="primary-action-card__content space-y-4">
          <p className="eyebrow">{t('dashboard.localEyebrow')}</p>
          <h2 id="local-play-title" className="text-2xl font-bold">{t('dashboard.localTitle')}</h2>
          <Text as="p" type="large">{t('dashboard.localDescription')}</Text>
          <span className="primary-action-card__label">{t('dashboard.startLocal')}</span>
        </div>
      </Link>
    </section>

    {dashboard.resumeGame ? <Card><div className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="flex items-center gap-3"><Play aria-hidden="true" size={20} /><div><h2 className="text-lg font-bold">{t('dashboard.resumeTitle')}</h2><Text as="p" type="supporting">{t(`dashboard.resume${dashboard.resumeGame.mode === 'local' ? 'Local' : 'Online'}`)}</Text></div></div><Link className="min-h-11 rounded-[var(--radius-element)] bg-[var(--color-accent)] px-4 py-3 font-semibold text-[var(--color-on-dark)]" to="/game">{t('dashboard.resumeAction')}</Link></div></Card> : null}

    {dashboard.showMemberSections ? <section className="grid gap-3 md:grid-cols-2" aria-label={t('dashboard.memberSummary')}>
      <Card><div className="space-y-2 p-5"><h2 className="text-lg font-bold">{t('dashboard.friendsTitle')}</h2>{friendsLoading ? <Text as="p" type="supporting" role="status">{t('common.loading')}</Text> : friendsError ? <Text as="p" role="alert">{t('dashboard.error')}</Text> : <Link className="flex min-h-11 items-center gap-3 font-semibold" to="/friends"><UsersRound aria-hidden="true" size={20} />{t('dashboard.friendCount', { count: dashboard.acceptedFriendCount })}</Link>}</div></Card>
      <Card><div className="space-y-2 p-5"><h2 className="text-lg font-bold">{t('dashboard.statsTitle')}</h2>{statsLoading ? <Text as="p" type="supporting" role="status">{t('common.loading')}</Text> : statsError ? <Text as="p" role="alert">{t('dashboard.error')}</Text> : dashboard.stats ? <Text as="p" type="large">{t('dashboard.gameCount', { count: dashboard.stats.gamesPlayed })} · {t('dashboard.winCount', { count: dashboard.stats.gamesWon })}</Text> : null}</div></Card>
    </section> : !isLoading ? <Text as="p" type="supporting"><Link className="font-semibold" to="/auth">{t('dashboard.accountPrompt')}</Link></Text> : null}

    {dashboard.showMemberSections ? <Card><section className="space-y-3 p-5" aria-labelledby="recent-results-title"><div className="flex items-center gap-2"><Clock3 aria-hidden="true" size={20} /><h2 id="recent-results-title" className="text-lg font-bold">{t('dashboard.recentTitle')}</h2></div>{statsLoading ? <Text as="p" type="supporting" role="status">{t('common.loading')}</Text> : statsError ? <Text as="p" role="alert">{t('dashboard.error')}</Text> : dashboard.recentResults.length ? <ul className="divide-y divide-[var(--color-border)]">{dashboard.recentResults.map((result) => <RecentResult key={`${result.playedAt}-${result.role}-${result.winner}`} result={result} />)}</ul> : <Text as="p" type="supporting">{t('dashboard.recentEmpty')}</Text>}</section></Card> : null}
  </section>
}

export default HomePage

function RecentResult({ result }: { result: PlayerResultView }) {
  const { t, i18n } = useTranslation()
  const roleKey = result.role === 'mr_white' ? 'mrWhite' : result.role
  const playedAt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(result.playedAt))

  return <li className="flex items-center justify-between gap-4 py-3"><div><p className="font-semibold">{t(`roles.${roleKey}`)}</p><Text as="p" type="supporting">{t('dashboard.winner', { winner: t(`dashboard.winner${result.winner === 'mr_white' ? 'MrWhite' : result.winner === 'undercovers' ? 'Undercovers' : result.winner === 'jester' ? 'Jester' : 'Civilians'}`) })} · {playedAt}</Text></div><span className={result.won ? 'font-semibold text-[var(--color-data-categorical-green)]' : 'text-[var(--color-text-secondary)]'}>{result.won ? t('dashboard.won') : t('dashboard.lost')}</span></li>
}
