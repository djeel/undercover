import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { api } from '../lib/api-client';
import { useGameStore } from '../features/game/game-store';

const MultiplayerSetupPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [query] = useSearchParams();
    const [name, setName] = useState('');
    const [code, setCode] = useState(query.get('code') ?? '');
    const [error, setError] = useState('');
    const [isLoading, setLoading] = useState(false);
    const game = useGameStore((state) => state.game);
    const playerId = useGameStore((state) => state.playerId);
    const setSession = useGameStore((state) => state.setSession);
    const clear = useGameStore((state) => state.clear);

    const create = async () => {
        setLoading(true); setError('');
        try { const room = await api.createGame({ language: i18n.language.startsWith('fr') ? 'fr' : 'en' }); const joined = await api.joinGame(room.roomCode, { displayName: name.trim() }); const own = joined.players.find((player) => player.id === room.hostPlayerId); if (!own) throw new Error(t('multiplayer.errorCreate')); setSession(joined, own.id); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('multiplayer.errorCreate')); } finally { setLoading(false); }
    };
    const join = async () => {
        setLoading(true); setError('');
        try { const joined = await api.joinGame(code.trim().toUpperCase(), { displayName: name.trim() }); const own = joined.players.find((player) => player.displayName === name.trim()); if (!own) throw new Error(t('multiplayer.errorJoin')); setSession(joined, own.id); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('multiplayer.errorJoin')); } finally { setLoading(false); }
    };

    if (game) { const host = game.hostPlayerId === playerId; return <section className="space-y-6"><header><h1 className="text-3xl font-bold">{t('multiplayer.lobby')}</h1><Text as="p" type="supporting">{game.roomCode}</Text></header><Card><div className="divide-y divide-[var(--color-border)] p-5">{game.players.map((player) => <div key={player.id} className="py-3">{player.displayName}</div>)}</div></Card>{host && <Button variant="primary" label={t('multiplayer.start')} isLoading={isLoading} onClick={() => void useGameStore.getState().startGame(api).then(() => navigate('/game')).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : t('multiplayer.errorStart')))} width="100%" />}<Button variant="secondary" label={t('common.back')} onClick={() => { clear(); navigate('/'); }} width="100%" />{error && <p role="alert">{error}</p>}</section>; }
    return <section className="space-y-6"><header><h1 className="text-3xl font-bold">{t('multiplayer.title')}</h1></header><div className="grid gap-4 md:grid-cols-2"><Card><div className="space-y-4 p-5"><h2 className="text-lg font-bold">{t('multiplayer.create')}</h2><TextInput label={t('setup.playerName')} value={name} onChange={setName} width="100%" /><Button variant="primary" label={t('multiplayer.create')} isDisabled={!name.trim()} isLoading={isLoading} onClick={() => void create()} width="100%" /></div></Card><Card><div className="space-y-4 p-5"><h2 className="text-lg font-bold">{t('multiplayer.join')}</h2><TextInput label={t('setup.playerName')} value={name} onChange={setName} width="100%" /><TextInput label={t('multiplayer.roomCode')} value={code} onChange={setCode} width="100%" /><Button variant="secondary" label={t('multiplayer.join')} isDisabled={!name.trim() || !code.trim()} isLoading={isLoading} onClick={() => void join()} width="100%" /></div></Card></div>{error && <p role="alert">{error}</p>}</section>;
};

export default MultiplayerSetupPage;
