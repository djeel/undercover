import type { CompositionMode, GameSettingsView } from '@undercover/shared'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../features/auth'
import { useGameStore } from '../features/game/game-store'
import { api } from '../lib/api-client'

const defaultSettings: GameSettingsView = { undercoverCount: 1, mrWhiteCount: 0, jesterCount: 0, bodyguardCount: 0, compositionMode: 'visible_manual' }
const compositionModes: Array<{ value: CompositionMode; label: string; disclosure?: string }> = [
  { value: 'visible_manual', label: 'visibleManual' },
  { value: 'hidden_manual', label: 'hiddenManual', disclosure: 'hiddenManualDisclosure' },
  { value: 'hidden_random', label: 'hiddenRandom', disclosure: 'hiddenRandomDisclosure' },
]

export default function MultiplayerSetupPage() {
  const { t, i18n } = useTranslation()
  const { isLoading: authLoading, isAnonymous } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [name, setName] = useState('')
  const [code, setCode] = useState(params.get('code') ?? '')
  const [settings, setSettings] = useState<GameSettingsView>(defaultSettings)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const game = useGameStore((state) => state.game)
  const playerId = useGameStore((state) => state.playerId)
  const setSession = useGameStore((state) => state.setSession)
  const clear = useGameStore((state) => state.clear)

  useEffect(() => {
    if (isAnonymous) return
    void api.getProfile().then((profile) => setName((current) => current || profile.displayName)).catch(() => undefined)
  }, [isAnonymous])

  const join = async (roomCode: string, hostPlayerId?: string) => {
    const displayName = name.trim()
    if (isAnonymous && !displayName) {
      setError(t('setup.playerName'))
      return
    }
    setWorking(true); setError(null)
    try {
      const joined = await api.joinGame(roomCode, isAnonymous ? { displayName } : {})
      const own = hostPlayerId ? joined.players.find((player) => player.id === hostPlayerId) : joined.players.find((player) => player.displayName === (displayName || name))
      if (!own) throw new Error(t('multiplayer.errorJoin'))
      setSession(joined, own.id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('multiplayer.errorJoin'))
    } finally {
      setWorking(false)
    }
  }

  const create = async () => {
    setWorking(true); setError(null)
    try {
      const room = await api.createGame({ language: i18n.language.startsWith('fr') ? 'fr' : 'en' })
      setWorking(false)
      await join(room.roomCode, room.hostPlayerId)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('multiplayer.errorCreate'))
      setWorking(false)
    }
  }

  const updateSettings = (key: Exclude<keyof GameSettingsView, 'compositionMode'>, value: string) => setSettings((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) }))

  if (authLoading) return <p role="status">{t('multiplayer.waitingForSession')}</p>
  if (game) {
    const host = game.hostPlayerId === playerId
    const currentSettings = game.settings ?? settings
    const applySettings = async () => { setWorking(true); setError(null); try { await useGameStore.getState().updateSettings(api, settings) } catch (cause) { setError(cause instanceof Error ? cause.message : t('common.error')) } finally { setWorking(false) } }
    return <section className="mx-auto max-w-3xl space-y-6"><header><h1 className="text-3xl font-bold">{t('multiplayer.lobby')}</h1><Text as="p" type="supporting">{t('multiplayer.roomCode')}: {game.roomCode}</Text></header><Card><ul className="divide-y divide-[var(--color-border)] p-5">{game.players.map((player) => <li className="py-3" key={player.id}>{player.displayName}</li>)}</ul></Card>{host ? <Card><div className="space-y-4 p-5"><fieldset><legend className="font-bold">{t('multiplayer.composition')}</legend><div className="mt-3 space-y-2">{compositionModes.map((mode) => <label className="flex cursor-pointer items-start gap-3" key={mode.value}><input type="radio" name="composition" value={mode.value} checked={settings.compositionMode === mode.value} onChange={() => setSettings((current) => ({ ...current, compositionMode: mode.value }))} /><span><strong>{t(`multiplayer.${mode.label}`)}</strong>{mode.disclosure && <small className="mt-1 block text-[var(--color-text-secondary)]">{t(`multiplayer.${mode.disclosure}`)}</small>}</span></label>)}</div></fieldset>{settings.compositionMode !== 'hidden_random' && <div className="grid grid-cols-2 gap-3">{(['undercoverCount', 'mrWhiteCount', 'jesterCount', 'bodyguardCount'] as const).map((key) => <label className="text-sm" key={key}>{t(`setup.${key}`)}<input className="mt-1 w-full rounded-[var(--radius-element)] border border-[var(--color-border)] bg-transparent p-2" type="number" min="0" value={settings[key]} onChange={(event) => updateSettings(key, event.target.value)} /></label>)}</div>}<Button variant="secondary" label="Save composition" isLoading={working} onClick={() => void applySettings()} width="100%" /><Button variant="primary" label={t('multiplayer.start')} isLoading={working} onClick={() => void useGameStore.getState().startGame(api).then(() => navigate('/game')).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : t('multiplayer.errorStart')))} width="100%" /></div></Card> : <p>{currentSettings.compositionMode === 'visible_manual' && game.settings ? t('multiplayer.visibleManual') : t('multiplayer.mysteryComposition')}</p>}{error && <p role="alert">{error}</p>}<Button variant="secondary" label={t('common.back')} onClick={() => { clear(); navigate('/') }} /></section>
  }

  const anonymousNameRequired = isAnonymous && !name.trim()
  return <section className="mx-auto max-w-3xl space-y-6"><header><h1 className="text-3xl font-bold">{t('multiplayer.title')}</h1></header><div className="grid gap-4 md:grid-cols-2"><Card><div className="space-y-4 p-5"><h2 className="text-lg font-bold">{t('multiplayer.create')}</h2>{isAnonymous && <TextInput label={t('setup.playerName')} value={name} onChange={setName} width="100%" />}<Button variant="primary" label={t('multiplayer.create')} isDisabled={anonymousNameRequired} isLoading={working} onClick={() => void create()} width="100%" /></div></Card><Card><div className="space-y-4 p-5"><h2 className="text-lg font-bold">{t('multiplayer.join')}</h2>{isAnonymous && <TextInput label={t('setup.playerName')} value={name} onChange={setName} width="100%" />}<TextInput label={t('multiplayer.roomCode')} value={code} onChange={setCode} width="100%" /><Button variant="secondary" label={t('multiplayer.join')} isDisabled={anonymousNameRequired || code.trim().length !== 6} isLoading={working} onClick={() => void join(code.trim().toUpperCase())} width="100%" /></div></Card></div>{error && <p role="alert">{error}</p>}</section>
}
