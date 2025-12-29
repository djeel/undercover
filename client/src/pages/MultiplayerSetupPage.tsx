import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Users, Plus, Play, X, LogOut, Copy, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { useGameStore } from '../store/gameStore';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import RoleSelector from '../components/RoleSelector';
import { cn } from '../lib/utils';

const MultiplayerSetupPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const [hasCopied, setHasCopied] = useState(false);

    // Game Settings State
    const [ucCount, setUcCount] = useState(1);
    const [whiteCount, setWhiteCount] = useState(0);
    const [jesterCount, setJesterCount] = useState(0);
    const [bodyguardCount, setBodyguardCount] = useState(0);

    const setOnlineState = useGameStore(state => state.setOnlineState);
    const onlineState = useGameStore(state => state.onlineState);
    const players = useGameStore(state => state.players);
    const syncWithServer = useGameStore(state => state.syncWithServer);
    const leaveRoom = useGameStore(state => state.leaveRoom);
    const kickPlayer = useGameStore(state => state.kickPlayer);
    const playerId = onlineState.playerId;


    const isHost = onlineState.isHost;
    const setGameMode = useGameStore(state => state.setGameMode);

    // Deep Link Handling
    useEffect(() => {
        const codeParam = searchParams.get('code');
        if (codeParam) {
            setGameMode('online');
            setRoomCode(codeParam);
            setIsJoining(true);
        }
    }, [searchParams, setGameMode]);

    const handleCopyLink = () => {
        // GitHub Pages Friendly: Link to ROOT (...) with ?code= param
        const baseUrl = window.location.href.split('/lobby')[0];
        const url = `${baseUrl}/?code=${onlineState.roomId}`;

        navigator.clipboard.writeText(url);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };

    // Polling effect
    useEffect(() => {
        if (!onlineState.roomId) return;

        // Establish Socket Connection for Presence (Disconnect detection)
        if (onlineState.playerId) {
            socketService.connect(onlineState.playerId);
            socketService.joinGame(onlineState.roomId);
        }

        const poll = async () => {
            try {
                const state = await api.getGameState(
                    onlineState.roomId!,
                    onlineState.playerId || undefined
                );
                syncWithServer(state);

                // Check if we are still in the game (might have been kicked)
                const me = state.players.find(p => p.id === onlineState.playerId);
                if (!me) {
                    leaveRoom(); // Clear state
                    navigate('/'); // Back to home
                    return;
                }

                // Check if host left the room
                const hostStillPresent = state.players.some(p => p.id === state.host_player_id);
                if (!hostStillPresent && state.host_player_id) {
                    // Host left - redirect everyone to home
                    leaveRoom();
                    navigate('/');
                    return;
                }

                // Navigate to reveal if started
                if (state.phase === 'PLAYING') {
                    navigate('/reveal');
                }
            } catch (e) {
                console.error('Polling error:', e);
            }
        };

        poll(); // Initial call
        const interval = setInterval(poll, 2000);
        return () => clearInterval(interval);
    }, [onlineState.roomId, onlineState.playerId, navigate, syncWithServer, leaveRoom]);


    const handleCreateRoom = async () => {
        if (!name.trim()) return;
        setIsLoading(true);
        setError('');
        try {
            const { game_id } = await api.createGame(undefined, i18n.language);
            const player = await api.joinGame(game_id, name);

            setOnlineState({
                roomId: game_id,
                playerId: player.player_id,
                isHost: true
            });
            // Stay here for Lobby view
        } catch (e) {
            setError(t('multiplayer.errorCreate'));
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!name.trim() || !roomCode.trim()) return;
        setIsLoading(true);
        setError('');
        try {
            const player = await api.joinGame(roomCode, name);
            setOnlineState({
                roomId: roomCode,
                playerId: player.player_id,
                isHost: false
            });
            // Stay here for Lobby view
        } catch (e) {
            setError(t('multiplayer.errorJoin'));
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartGame = async () => {
        if (!onlineState.roomId) return;
        try {
            await api.assignRoles(onlineState.roomId, ucCount, whiteCount, jesterCount, bodyguardCount);
        } catch (e) {
            setError('Failed to start game');
        }
    };

    // Lobby View
    if (onlineState.roomId) {
        return (
            <div className="min-h-screen p-4 bg-background pb-20 flex flex-col animate-in fade-in duration-300">
                <div className="max-w-md mx-auto w-full flex-1 flex flex-col space-y-6">
                    <header className="flex items-center justify-between py-4">
                        <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => { leaveRoom(); navigate('/'); }}>
                            <LogOut className="w-5 h-5 mr-2" />
                            {t('multiplayer.leaveRoom')}
                        </Button>
                        <h1 className="text-xl font-bold text-foreground tracking-wide">{t('multiplayer.lobby')}</h1>
                        <div className="w-16" />
                    </header>

                    <Card className="border-border bg-card shadow-xl">
                        <CardHeader className="text-center">
                            <CardTitle className="text-muted-foreground text-sm font-medium uppercase tracking-wider">{t('multiplayer.roomCode')}</CardTitle>
                            <div className="text-4xl font-mono font-bold text-foreground tracking-widest mt-2 flex items-center justify-center gap-3">
                                {onlineState.roomId}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCopyLink}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                    title="Copy Invite Link"
                                >
                                    {hasCopied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                                </Button>
                            </div>
                            <CardDescription>{t('multiplayer.shareCode')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>{t('multiplayer.players')} ({players.length})</span>
                                    {isHost && <span className="text-accent-foreground text-xs bg-accent px-2 py-1 rounded font-bold">{t('multiplayer.host')}</span>}
                                </div>
                                <div className="grid gap-2">
                                    {players.map((p) => (
                                        <div key={p.id} className="bg-secondary/50 p-3 rounded-xl flex items-center gap-3 border border-border">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                                                {p.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-foreground flex-1 font-medium">{p.name} {p.id === onlineState.playerId && <span className="text-muted-foreground font-normal">({t('multiplayer.you')})</span>}</span>
                                            {isHost && p.id !== playerId && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => kickPlayer(p.id)}
                                                    className="w-8 h-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>



                            {isHost ? (
                                <>
                                    <div className="space-y-4 border-t border-border pt-4">
                                        <div className="grid gap-3">
                                            <RoleSelector
                                                roleKey="undercover"
                                                count={ucCount}
                                                onChange={setUcCount}
                                                min={1}
                                                max={3}
                                            />

                                            <RoleSelector
                                                roleKey="mrWhite"
                                                count={whiteCount}
                                                onChange={setWhiteCount}
                                                min={0}
                                                max={3}
                                            />

                                            <RoleSelector
                                                roleKey="jester"
                                                count={jesterCount}
                                                onChange={setJesterCount}
                                                min={0}
                                                max={1}
                                            />

                                            <RoleSelector
                                                roleKey="bodyguard"
                                                count={bodyguardCount}
                                                onChange={setBodyguardCount}
                                                min={0}
                                                max={1}
                                            />
                                        </div>

                                        <Button
                                            onClick={handleStartGame}
                                            disabled={players.length < 3}
                                            className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 rounded-xl"
                                        >
                                            <Play className="w-5 h-5 mr-2" />
                                            {t('setup.startGame')}
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-6 bg-secondary/30 rounded-xl text-muted-foreground animate-pulse border border-dashed border-border">
                                    {t('multiplayer.waitingForHost')}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Create/Join View
    return (
        <div className="min-h-screen p-4 bg-background pb-20 flex flex-col animate-in fade-in duration-300">
            <div className="max-w-md mx-auto w-full flex-1 flex flex-col space-y-6">
                <header className="flex items-center justify-between py-4">
                    <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => navigate('/')}>
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        {t('common.back')}
                    </Button>
                    <h1 className="text-xl font-bold text-foreground tracking-wide">{t('multiplayer.title')}</h1>
                    <div className="w-16" />
                </header>

                <Card className="border-border bg-card shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-foreground flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            {t('multiplayer.joinOrCreate')}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">{t('multiplayer.enterName')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">{t('multiplayer.nickname')}</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('multiplayer.yourName')}
                                className="bg-background border-border text-foreground"
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4">
                            {!isJoining ? (
                                <>
                                    <Button
                                        onClick={handleCreateRoom}
                                        disabled={!name.trim() || isLoading}
                                        className="h-14 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 rounded-xl"
                                    >
                                        <Plus className="w-5 h-5 mr-2" />
                                        {t('multiplayer.createRoom')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsJoining(true)}
                                        className="h-14 text-lg border-border bg-card text-foreground hover:bg-muted rounded-xl"
                                    >
                                        {t('multiplayer.joinRoom')}
                                    </Button>
                                </>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">{t('multiplayer.roomCode')}</label>
                                        <Input
                                            value={roomCode}
                                            onChange={(e) => setRoomCode(e.target.value)}
                                            placeholder={t('multiplayer.enterCode')}
                                            className="bg-background border-border text-foreground font-mono uppercase"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setIsJoining(false)}
                                            className="flex-1 text-muted-foreground hover:text-foreground"
                                        >
                                            {t('multiplayer.cancel')}
                                        </Button>
                                        <Button
                                            onClick={handleJoinRoom}
                                            disabled={!name.trim() || !roomCode.trim() || isLoading}
                                            className="flex-[2] bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 rounded-xl"
                                        >
                                            {t('multiplayer.joinGame')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default MultiplayerSetupPage;
