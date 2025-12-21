import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Users, Plus, Play } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { useGameStore } from '../store/gameStore';
import { api } from '../services/api';

const MultiplayerSetupPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const setOnlineState = useGameStore(state => state.setOnlineState);
    const onlineState = useGameStore(state => state.onlineState);
    const players = useGameStore(state => state.players);
    const syncWithServer = useGameStore(state => state.syncWithServer);
    const phase = useGameStore(state => state.phase);
    const isHost = onlineState.isHost;

    // Polling effect
    useEffect(() => {
        if (!onlineState.roomId) return;

        const poll = async () => {
            try {
                const state = await api.getGameState(
                    onlineState.roomId!,
                    onlineState.playerId || undefined
                );
                syncWithServer(state);

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
    }, [onlineState.roomId, onlineState.playerId, navigate, syncWithServer]);


    const handleCreateRoom = async () => {
        if (!name.trim()) return;
        setIsLoading(true);
        setError('');
        try {
            const { game_id } = await api.createGame();
            const player = await api.joinGame(game_id, name);

            setOnlineState({
                roomId: game_id,
                playerId: player.player_id,
                isHost: true
            });
            // Stay here for Lobby view
        } catch (e) {
            setError('Failed to create room. Is the server running?');
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
            setError('Failed to join room. Check code or connection.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartGame = async () => {
        if (!onlineState.roomId) return;
        try {
            // Hardcoded configuration for now, could add UI for these
            await api.assignRoles(onlineState.roomId, 1, 1);
        } catch (e) {
            setError('Failed to start game');
        }
    };

    // Lobby View
    if (onlineState.roomId) {
        return (
            <div className="min-h-screen p-4 bg-background pb-20 flex flex-col">
                <div className="max-w-md mx-auto w-full flex-1 flex flex-col space-y-6">
                    <header className="flex items-center justify-between py-4">
                        <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => navigate('/')}>
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Return
                        </Button>
                        <h1 className="text-xl font-bold text-white tracking-wide">Lobby</h1>
                        <div className="w-16" />
                    </header>

                    <Card className="border-zinc-800 bg-[#18181B]">
                        <CardHeader className="text-center">
                            <CardTitle className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Room Code</CardTitle>
                            <div className="text-4xl font-mono font-bold text-white tracking-widest mt-2">
                                {onlineState.roomId}
                            </div>
                            <CardDescription>Share this code with your friends</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm text-zinc-400">
                                    <span>Players ({players.length})</span>
                                    {isHost && <span className="text-accent text-xs bg-accent/10 px-2 py-1 rounded">HOST</span>}
                                </div>
                                <div className="grid gap-2">
                                    {players.map((p) => (
                                        <div key={p.id} className="bg-zinc-900/50 p-3 rounded-lg flex items-center gap-3 border border-zinc-800/50">
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold text-xs">
                                                {p.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-zinc-200">{p.name} {p.id === onlineState.playerId && "(You)"}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {isHost ? (
                                <Button
                                    onClick={handleStartGame}
                                    disabled={players.length < 3}
                                    className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                                >
                                    <Play className="w-5 h-5 mr-2" />
                                    Start Game
                                </Button>
                            ) : (
                                <div className="text-center p-4 bg-zinc-900/50 rounded-xl text-zinc-500 animate-pulse">
                                    Waiting for host to start...
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
        <div className="min-h-screen p-4 bg-background pb-20 flex flex-col">
            <div className="max-w-md mx-auto w-full flex-1 flex flex-col space-y-6">
                <header className="flex items-center justify-between py-4">
                    <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => navigate('/')}>
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        {t('common.back')}
                    </Button>
                    <h1 className="text-xl font-bold text-white tracking-wide">Multiplayer</h1>
                    <div className="w-16" />
                </header>

                <Card className="border-zinc-800 bg-[#18181B]">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-accent" />
                            Join or Create
                        </CardTitle>
                        <CardDescription>Enter your name to start</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Nickname</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your Name"
                                className="bg-zinc-900 border-zinc-800 text-white"
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4">
                            {!isJoining ? (
                                <>
                                    <Button
                                        onClick={handleCreateRoom}
                                        disabled={!name.trim() || isLoading}
                                        className="h-14 text-lg bg-accent hover:bg-accent/90 text-white shadow-md shadow-accent/20"
                                    >
                                        <Plus className="w-5 h-5 mr-2" />
                                        Create Room
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsJoining(true)}
                                        className="h-14 text-lg border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800"
                                    >
                                        Join Room
                                    </Button>
                                </>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-300">Room Code</label>
                                        <Input
                                            value={roomCode}
                                            onChange={(e) => setRoomCode(e.target.value)}
                                            placeholder="Enter Code"
                                            className="bg-zinc-900 border-zinc-800 text-white font-mono uppercase"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setIsJoining(false)}
                                            className="flex-1 text-zinc-400"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleJoinRoom}
                                            disabled={!name.trim() || !roomCode.trim() || isLoading}
                                            className="flex-[2] bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                                        >
                                            Join Game
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
