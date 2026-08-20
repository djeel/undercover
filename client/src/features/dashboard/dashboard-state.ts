import type { FriendshipView, GameView, PlayerResultView, PlayerStatsView } from '@undercover/shared'

export interface DashboardState {
  showMemberSections: boolean
  acceptedFriendCount: number
  stats: PlayerStatsView | null
  recentResults: PlayerResultView[]
  resumeGame: { mode: 'local' | 'online' } | null
}

export interface DashboardStateInput {
  isAnonymous: boolean
  friends: FriendshipView[]
  stats: PlayerStatsView | null
  onlineGame?: GameView | null
  localPhase?: 'idle' | 'setup' | 'reveal' | GameView['phase']
}

const activeOnlinePhases: Record<GameView['phase'], boolean> = {
  lobby: false,
  playing: true,
  voting: true,
  mr_white_guess: true,
  finished: false,
}
const activeLocalPhases: Record<NonNullable<DashboardStateInput['localPhase']>, boolean> = {
  idle: false,
  setup: false,
  reveal: false,
  lobby: false,
  playing: true,
  voting: true,
  mr_white_guess: true,
  finished: false,
}

export function getDashboardState({ isAnonymous, friends, stats, onlineGame = null, localPhase = 'idle' }: DashboardStateInput): DashboardState {
  const resumeGame = activeLocalPhases[localPhase]
    ? { mode: 'local' as const }
    : onlineGame && activeOnlinePhases[onlineGame.phase]
      ? { mode: 'online' as const }
      : null

  if (isAnonymous) {
    return { showMemberSections: false, acceptedFriendCount: 0, stats: null, recentResults: [], resumeGame }
  }

  return {
    showMemberSections: true,
    acceptedFriendCount: friends.filter((friend) => friend.status === 'accepted').length,
    stats,
    recentResults: stats?.results ?? [],
    resumeGame,
  }
}
