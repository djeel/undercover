import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Play, X, Copy, Check, Settings2, User, Gamepad2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { api } from '../lib/api-client';
import { useGameStore } from '../features/game/game-store';
import RoleSelector from '../components/RoleSelector';

const MultiplayerSetupPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState(searchParams.get('code') ?? '');
    const isJoining = Boolean(searchParams.get('code'));
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);
    const [settings, setSettings] = useState({ undercoverCount: 1, mrWhiteCount: 0, jesterCount: 0, bodyguardCount: 0, compositionMode: 'visible_manual' as const });
    const game = useGameStore((state) => state.game);
    const playerId = useGameStore((state) => state.playerId);
    const setSession = useGameStore((state) => state.setSession);
    const updateSettings = useGameStore((state) => state.updateSettings);
    const startGame = useGameStore((state) => state.startGame);
    const kickMember = useGameStore((state) => state.kickMember);
    const clear = useGameStore((state) => state.clear);

    const create = async () => {
        if (!name.trim()) return;
        setIsLoading(true); setError('');
        try {
            const room = await api.createGame({ language: i18n.language.startsWith('fr') ? 'fr' : 'en' });
            const joined = await api.joinGame(room.roomCode, { displayName: name.trim() });
            const own = joined.players.find((player) => player.id === room.hostPlayerId);
            if (!own) throw new Error('Host membership was not created');
            setSession(joined, own.id);
        } catch (cause) { setError(cause instanceof Error ? cause.message : t('multiplayer.errorCreate')); } finally { setIsLoading(false); }
    };
    const join = async () => {
        if (!name.trim() || !roomCode.trim()) return;
        setIsLoading(true); setError('');
        try {
            const joined = await api.joinGame(roomCode.trim().toUpperCase(), { displayName: name.trim() });
            const own = joined.players.find((player) => player.displayName === name.trim());
            if (!own) throw new Error('Membership was not returned');
            setSession(joined, own.id);
        } catch (cause) { setError(cause instanceof Error ? cause.message : t('multiplayer.errorJoin')); } finally { setIsLoading(false); }
    };

    if (game) {
        const isHost = game.hostPlayerId === playerId;
        return <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500"><header className="flex items-center justify-between"><h1 className="text-3xl font-black text-foreground tracking-tight">{t('multiplayer.lobby')}</h1><Button variant="ghost" size="icon" onClick={() => { clear(); navigate('/'); }}><X className="w-5 h-5" /></Button></header><Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" />{game.roomCode}<Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL}?code=${game.roomCode}`); setHasCopied(true); }}><Copy className="w-4 h-4" />{hasCopied && <Check className="w-4 h-4 text-emerald-500" />}</Button></CardTitle></CardHeader><CardContent className="space-y-2">{game.players.map((player) => <div key={player.id} className="flex items-center justify-between rounded-xl bg-secondary/30 p-3"><span>{player.displayName}</span>{isHost && player.id !== playerId && <Button size="sm" variant="ghost" onClick={() => void kickMember(api, player.id)}>{t('setup.removePlayer')}</Button>}</div>)}</CardContent></Card>{isHost && <Card><CardHeader><CardTitle><Settings2 className="inline mr-2 w-5 h-5" />{t('setup.settings')}</CardTitle></CardHeader><CardContent className="space-y-3"><RoleSelector roleKey="undercover" count={settings.undercoverCount} onChange={(undercoverCount) => setSettings((value) => ({ ...value, undercoverCount }))} min={1} max={Math.max(1, game.players.length - 2)} /><RoleSelector roleKey="mrWhite" count={settings.mrWhiteCount} onChange={(mrWhiteCount) => setSettings((value) => ({ ...value, mrWhiteCount }))} min={0} max={1} /><RoleSelector roleKey="jester" count={settings.jesterCount} onChange={(jesterCount) => setSettings((value) => ({ ...value, jesterCount }))} min={0} max={1} /><RoleSelector roleKey="bodyguard" count={settings.bodyguardCount} onChange={(bodyguardCount) => setSettings((value) => ({ ...value, bodyguardCount }))} min={0} max={1} /><Button variant="secondary" className="w-full" onClick={() => void updateSettings(api, settings)}>{t('common.save', 'Save')}</Button><Button className="w-full" onClick={async () => { await startGame(api); navigate('/reveal'); }} disabled={game.players.length < 3}><Play className="mr-2 w-4 h-4" />{t('setup.startGame')}</Button></CardContent></Card>}</div>;
    }
    return <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500"><header><h1 className="text-3xl font-black text-foreground tracking-tight">{t('multiplayer.title')}</h1></header><div className="grid gap-6 md:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Gamepad2 className="w-5 h-5 text-primary" />{t('multiplayer.create')}</CardTitle></CardHeader><CardContent className="space-y-3"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t('setup.playerName')} /><Button className="w-full" disabled={isLoading || !name.trim()} onClick={() => void create()}>{t('multiplayer.create')}</Button></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" />{t('multiplayer.join')}</CardTitle></CardHeader><CardContent className="space-y-3"><Input value={roomCode} onChange={(event) => setRoomCode(event.target.value)} placeholder={t('multiplayer.roomCode')} /><Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t('setup.playerName')} /><Button className="w-full" disabled={isLoading || !name.trim() || !roomCode.trim()} onClick={() => void join()}>{isJoining ? t('multiplayer.join') : t('multiplayer.join')}</Button></CardContent></Card></div>{error && <p className="text-sm text-destructive">{error}</p>}</div>;
};

export default MultiplayerSetupPage;
