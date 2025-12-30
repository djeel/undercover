import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Play, X, Copy, Check, Settings2, User, Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
        const baseUrl = window.location.href.split('/lobby')[0];
        const url = `${baseUrl}/?code=${onlineState.roomId}`;
        navigator.clipboard.writeText(url);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };

    // Polling effect
    useEffect(() => {
        if (!onlineState.roomId) return;
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

                const me = state.players.find(p => p.id === onlineState.playerId);
                if (!me) {
                    leaveRoom();
                    navigate('/');
                    return;
                }

                const hostStillPresent = state.players.some(p => p.id === state.host_player_id);
                if (!hostStillPresent && state.host_player_id) {
                    leaveRoom();
                    navigate('/');
                    return;
                }

                if (state.phase === 'PLAYING') {
                    navigate('/reveal');
                }
            } catch (e) {
                console.error('Polling error:', e);
            }
        };

        poll();
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
            setOnlineState({ roomId: game_id, playerId: player.player_id, isHost: true });
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
            setOnlineState({ roomId: roomCode, playerId: player.player_id, isHost: false });
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
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="flex items-center justify-between">
                    <h1 className="text-3xl font-black text-foreground tracking-tight">{t('multiplayer.lobby')}</h1>
                </header>

                <div className="grid gap-6">
                    {/* Players Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-foreground">
                                <Users className="w-5 h-5 text-primary" />
                                {t('multiplayer.players')}
                                <span className="ml-auto text-sm font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                    {players.length}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Room Code Display */}
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <div className="flex-1 h-10 px-3 rounded-md border border-input bg-secondary/50 text-foreground flex items-center justify-center font-mono font-bold tracking-widest select-all">
                                        {onlineState.roomId}
                                    </div>
                                    <Button size="icon" onClick={handleCopyLink} className="aspect-square bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                                        {hasCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground text-center">{t('multiplayer.shareCode')}</p>
                            </div>

                            <div className="max-h-60 overflow-y-auto pr-1 custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <AnimatePresence initial={false} mode="popLayout">
                                    {players.map((p) => (
                                        <motion.div
                                            key={p.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="group relative flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-transparent hover:border-border transition-all"
                                        >
                                            <span className="font-medium text-foreground truncate pr-8 flex items-center gap-2">
                                                {p.name}
                                                {p.id === onlineState.playerId && <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">YOU</span>}
                                                {isHost && p.id === onlineState.playerId && <span className="text-[10px] text-accent-foreground bg-accent/20 px-1.5 py-0.5 rounded">HOST</span>}
                                            </span>

                                            {isHost && p.id !== playerId && (
                                                <button
                                                    onClick={() => kickPlayer(p.id)}
                                                    className="absolute right-2 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Settings Card */}
                    {(isHost) && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Settings2 className="w-5 h-5 text-primary" />
                                    {t('setup.settings')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-3">
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
                                    isToggle={true}
                                />
                                <RoleSelector
                                    roleKey="bodyguard"
                                    count={bodyguardCount}
                                    onChange={setBodyguardCount}
                                    min={0}
                                    max={1}
                                    isToggle={true}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {!isHost && (
                        <div className="text-center p-6 bg-secondary/20 rounded-xl text-muted-foreground animate-pulse border border-dashed border-border flex flex-col items-center gap-2">
                            <Settings2 className="w-8 h-8 opacity-50" />
                            <span>{t('multiplayer.waitingForHost')}</span>
                        </div>
                    )}
                </div>

                {/* Sticky Start Button */}
                {isHost && (
                    <div className="sticky bottom-20 md:bottom-4 pt-4 z-10 bg-background/0 pointer-events-none pb-4">
                        <Button
                            size="lg"
                            onClick={handleStartGame}
                            disabled={players.length < 3}
                            className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 font-bold rounded-2xl pointer-events-auto"
                        >
                            <Play className="w-5 h-5 mr-2" />
                            {t('setup.startGame')}
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // Create/Join View
    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center justify-between">
                <h1 className="text-3xl font-black text-foreground tracking-tight">{t('multiplayer.title')}</h1>
            </header>

            <div className="grid gap-6">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <User className="w-5 h-5 text-primary" />
                            {t('multiplayer.identity')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('multiplayer.yourName')}
                            className="bg-secondary/50 border-transparent focus:bg-background transition-all h-12"
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Gamepad2 className="w-5 h-5 text-primary" />
                            {t('multiplayer.joinOrCreate')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <p className="text-sm text-destructive font-medium px-1 bg-destructive/10 p-2 rounded-lg">{error}</p>
                        )}

                        {!isJoining ? (
                            <div className="grid gap-3">
                                <Button
                                    onClick={handleCreateRoom}
                                    disabled={!name.trim() || isLoading}
                                    size="lg"
                                    className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 rounded-xl"
                                >
                                    <Plus className="w-5 h-5 mr-2" />
                                    {t('multiplayer.createRoom')}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsJoining(true)}
                                    className="w-full h-14 text-lg border-border bg-card text-foreground hover:bg-muted rounded-xl"
                                >
                                    {t('multiplayer.joinRoom')}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">{t('multiplayer.roomCode')}</label>
                                    <Input
                                        value={roomCode}
                                        onChange={(e) => setRoomCode(e.target.value)}
                                        placeholder={t('multiplayer.enterCode')}
                                        className="bg-secondary/50 border-transparent focus:bg-background font-mono uppercase h-12 tracking-widest text-center text-lg"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setIsJoining(false)}
                                        className="flex-1 text-muted-foreground hover:text-foreground h-12"
                                    >
                                        {t('multiplayer.cancel')}
                                    </Button>
                                    <Button
                                        onClick={handleJoinRoom}
                                        disabled={!name.trim() || !roomCode.trim() || isLoading}
                                        className="flex-[2] bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 rounded-xl h-12"
                                    >
                                        {t('multiplayer.joinGame')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default MultiplayerSetupPage;
