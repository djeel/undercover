import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Users, ArrowRight, Minus, Settings2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useGameStore } from '../store/gameStore';

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

    const handleAddPlayer = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (newPlayerName.trim()) {
            addPlayer(newPlayerName);
            setNewPlayerName('');
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
                        <form onSubmit={handleAddPlayer} className="flex gap-2">
                            <Input
                                placeholder={t('setup.playerName')}
                                value={newPlayerName}
                                onChange={(e) => setNewPlayerName(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 text-white focus:ring-primary focus:border-primary"
                            />
                            <Button type="submit" size="icon" disabled={!newPlayerName.trim()} className="bg-primary hover:bg-primary/90 rounded-xl">
                                <Plus className="w-5 h-5" />
                            </Button>
                        </form>

                        <div className="flex-1 overflow-y-auto min-h-[150px] max-h-[300px] pr-2 custom-scrollbar space-y-2">
                            <AnimatePresence initial={false}>
                                {players.map((player) => (
                                    <motion.div
                                        key={player.id}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800"
                                    >
                                        <span className="font-medium text-zinc-200">{player.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removePlayer(player.id)}
                                            className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {players.length === 0 && (
                                <p className="text-center text-zinc-600 py-4 text-sm italic">
                                    {t('setup.minPlayers', { count: 3 })}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-[#18181B]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Settings2 className="w-5 h-5 text-secondary" />
                            {t('setup.settings')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Undercovers */}
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-zinc-300">{t('setup.undercoverCount')}</label>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => updateCount(false)}
                                    disabled={config.undercoverCount <= 0}
                                    className="h-8 w-8 border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
                                >
                                    <Minus className="w-4 h-4" />
                                </Button>
                                <span className="font-bold text-secondary w-6 text-center text-lg">
                                    {config.undercoverCount}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => updateCount(true)}
                                    disabled={config.undercoverCount >= maxUndercover}
                                    className="h-8 w-8 border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Mr White Toggle */}
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-zinc-300">{t('setup.mrWhiteCount')}</label>
                            <Button
                                onClick={toggleMrWhite}
                                variant={config.mrWhiteCount > 0 ? "default" : "outline"}
                                className={config.mrWhiteCount > 0
                                    ? "bg-accent hover:bg-accent/90 text-white border-0"
                                    : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white"
                                }
                            >
                                {config.mrWhiteCount > 0 ? "ON" : "OFF"}
                            </Button>
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
                        className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-full font-bold"
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
