import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Users, ArrowRight, Minus, Settings2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useGameStore } from '../store/gameStore';
import { cn } from '../lib/utils';
import RoleSelector from '../components/RoleSelector';

const SetupPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const {
        players,
        config,
        addPlayer,
        removePlayer,
        updateConfig,
        startGame
    } = useGameStore();

    const [newPlayerName, setNewPlayerName] = useState('');
    const [error, setError] = useState('');

    const handleAddPlayer = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (newPlayerName.trim()) {
            const success = addPlayer(newPlayerName);
            if (success) {
                setNewPlayerName('');
                setError('');
            } else {
                setError(t('setup.duplicateName'));
            }
        }
    };

    const handleStartGame = () => {
        if (players.length >= 3) {
            startGame();
            navigate('/reveal');
        }
    };

    const maxUndercover = Math.max(0, Math.ceil(players.length / 2) - 1);

    const updateCount = (increment: boolean) => {
        const current = config.undercoverCount;
        let next = increment ? current + 1 : current - 1;
        if (next < 0) next = 0;
        if (next > maxUndercover) next = maxUndercover;
        updateConfig({ undercoverCount: next });
    };

    const toggleMrWhite = () => {
        updateConfig({ mrWhiteCount: config.mrWhiteCount > 0 ? 0 : 1 });
    };

    return (
        <div className="min-h-screen p-4 bg-background pb-20 flex flex-col">
            <div className="max-w-md mx-auto w-full flex-1 flex flex-col space-y-6">
                <header className="flex items-center justify-between py-4">
                    <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => navigate('/')}>
                        {t('common.back')}
                    </Button>
                    <h1 className="text-xl font-bold text-white tracking-wide">{t('setup.title')}</h1>
                    <div className="w-16" />
                </header>

                <Card className="border-zinc-800 bg-[#18181B] flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Users className="w-5 h-5 text-primary" />
                            {t('setup.players')}
                            <span className="text-sm font-normal text-zinc-500 ml-auto">
                                {players.length}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col min-h-0">
                        <div className="space-y-2">
                            <form onSubmit={handleAddPlayer} className="flex gap-2">
                                <Input
                                    placeholder={t('setup.playerName')}
                                    value={newPlayerName}
                                    onChange={(e) => {
                                        setNewPlayerName(e.target.value);
                                        setError('');
                                    }}
                                    className={cn(
                                        "bg-zinc-900 border-zinc-800 text-white focus:ring-primary focus:border-primary",
                                        error && "border-red-500 focus:border-red-500 focus:ring-red-500"
                                    )}
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={!newPlayerName.trim()}
                                    className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 shrink-0 aspect-square"
                                >
                                    <Plus className="w-5 h-5" />
                                </Button>
                            </form>
                            {error && (
                                <p className="text-xs text-red-500 px-1">{error}</p>
                            )}
                        </div>

                        <div className="h-48 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-2 gap-3 content-start">
                            <AnimatePresence initial={false} mode="popLayout">
                                {players.map((player) => (
                                    <motion.div
                                        key={player.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 relative group overflow-hidden"
                                    >
                                        <span className="font-medium text-zinc-200 truncate pr-6">{player.name}</span>
                                        <button
                                            onClick={() => removePlayer(player.id)}
                                            className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center bg-zinc-800/50 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                        {players.length === 0 && (
                            <p className="text-center text-zinc-600 py-4 text-sm italic col-span-2">
                                {t('setup.minPlayers', { count: 3 })}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-[#18181B]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Settings2 className="w-5 h-5 text-primary" />
                            {t('setup.settings')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-3">
                            <RoleSelector
                                roleKey="undercover"
                                count={config.undercoverCount}
                                onChange={(val) => updateConfig({ undercoverCount: val })}
                                min={0} // Changed to 0 so you can have 0 UC if you want (e.g. just Mr White) - logic allows at least 1 "impostor" usually, but flexible here.
                                max={maxUndercover}
                            />

                            <RoleSelector
                                roleKey="mrWhite"
                                count={config.mrWhiteCount}
                                onChange={(val) => updateConfig({ mrWhiteCount: val })}
                                min={0}
                                max={3}
                            />

                            <RoleSelector
                                roleKey="jester"
                                count={config.jesterCount}
                                onChange={(val) => updateConfig({ jesterCount: val })}
                                min={0}
                                max={1}
                            />

                            <RoleSelector
                                roleKey="bodyguard"
                                count={config.bodyguardCount}
                                onChange={(val) => updateConfig({ bodyguardCount: val })}
                                min={0}
                                max={1}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent z-10 pointer-events-none">
                <div className="max-w-md mx-auto pointer-events-auto">
                    <Button
                        size="lg"
                        onClick={handleStartGame}
                        disabled={players.length < 3}
                        className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 font-bold"
                    >
                        {t('setup.startGame')}
                        <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SetupPage;
