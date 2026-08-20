import type { CreateGamePayload, GameView, JoinGamePayload, JoinGameResponse } from '@undercover/shared'

interface GameJoinApi {
  joinGame(roomCode: string, body: JoinGamePayload): Promise<JoinGameResponse>
}

interface JoinOnlineSessionOptions {
  api: GameJoinApi
  roomCode: string
  setSession(game: GameView, playerId: string): void
}

export async function joinOnlineSession({ api, roomCode, setSession }: JoinOnlineSessionOptions) {
  const joined = await api.joinGame(roomCode, {})
  setSession(joined.game, joined.playerId)
  return joined.game
}


interface GameCreationApi {
  createGame(body: CreateGamePayload): Promise<{ roomCode: string; hostPlayerId: string }>
  getGame(roomCode: string): Promise<GameView>
}

interface CreateOnlineSessionOptions {
  api: GameCreationApi
  language: CreateGamePayload['language']
  displayName?: string
  setSession(game: GameView, playerId: string): void
}

export async function createOnlineSession({ api, language, displayName, setSession }: CreateOnlineSessionOptions) {
  const trimmedDisplayName = displayName?.trim()
  const body: CreateGamePayload = trimmedDisplayName ? { language, displayName: trimmedDisplayName } : { language }
  const created = await api.createGame(body)
  const game = await api.getGame(created.roomCode)
  const host = game.players.find((player) => player.id === created.hostPlayerId)

  if (!host) throw new Error('Created game does not include its host')

  setSession(game, host.id)
  return game
}
