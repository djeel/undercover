import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Users, ArrowRight, Settings2 } from 'lucide-react';
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

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center justify-between">
                <h1 className="text-3xl font-black text-foreground tracking-tight">{t('setup.title')}</h1>
                {/* Back button handled by browser or tab bar usually, but let's keep a clear visual cue maybe? 
                     Actually, with TabBar, navigating back to Home is easy. 
                     But let's keep a small back indication for UX safety. */}
                {/* <Button variant="ghost" onClick={() => navigate('/')}>Cancel</Button> */}
            </header>

            <div className="grid gap-6">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Users className="w-5 h-5 text-primary" />
                            {t('setup.players')}
                            <span className="ml-auto text-sm font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                {players.length}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                        "bg-secondary/50 border-transparent focus:bg-background transition-all",
                                        error && "border-destructive focus:border-destructive"
                                    )}
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={!newPlayerName.trim()}
                                    className="aspect-square bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                                >
                                    <Plus className="w-5 h-5" />
                                </Button>
                            </form>
                            {error && (
                                <p className="text-xs text-destructive font-medium px-1">{error}</p>
                            )}
                        </div>

                        <div className="max-h-60 overflow-y-auto pr-1 custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <AnimatePresence initial={false} mode="popLayout">
                                {players.map((player) => (
                                    <motion.div
                                        key={player.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="group relative flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-transparent hover:border-border transition-all"
                                    >
                                        <span className="font-medium text-foreground truncate pr-8">{player.name}</span>
                                        <button
                                            onClick={() => removePlayer(player.id)}
                                            className="absolute right-2 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {players.length === 0 && (
                            <div className="text-center py-6 text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border">
                                {t('setup.minPlayers', { count: 3 })}
                            </div>
                        )}
                    </CardContent>
                </Card>

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
                            count={config.undercoverCount}
                            onChange={(val) => updateConfig({ undercoverCount: val })}
                            min={0}
                            max={maxUndercover}
                        />

                        <RoleSelector
                            roleKey="mrWhite"
                            count={config.mrWhiteCount}
                            onChange={(val) => updateConfig({ mrWhiteCount: val })}
                            min={0}
                            max={3}
                            isToggle={true}
                        />
                        {/* Note: In previous file isToggle was passed implicitly or logic handled it? 
                            Ah, looked at RoleSelector update, I added isToggle prop support but kept logic same-ish. 
                            Actually previously MrWhite was 0-3 selector. Let's keep it selector unless 'isToggle' is preferred.
                            I'll pass isToggle={false} or just omit it to keep count behavior, 
                            OR if the user wants MrWhite to be just ON/OFF (1 or 0) I'd use isToggle.
                            The previous code had max=3 for mrWhite. So multiple Mr Whites are allowed.
                            So I should NOT use isToggle for MrWhite unless I want to change game rules.
                            Let's keep it count selector.
                        */}

                        <RoleSelector
                            roleKey="jester"
                            count={config.jesterCount}
                            onChange={(val) => updateConfig({ jesterCount: val })}
                            min={0}
                            max={1}
                            isToggle={true} // Jester is usually unique
                        />

                        <RoleSelector
                            roleKey="bodyguard"
                            count={config.bodyguardCount}
                            onChange={(val) => updateConfig({ bodyguardCount: val })}
                            min={0}
                            max={1}
                            isToggle={true} // Bodyguard is usually unique
                        />
                    </CardContent>
                </Card>
            </div>

            <div className="sticky bottom-4 pt-4 z-10 bg-background/0 backdrop-blur-none pointer-events-none">
                {/* We rely on the layout padding-bottom for scroll space, this button is just fixed or sticky? 
                    Let's make it just part of the flow but clear. 
                    Or sticky to bottom of container.
                */}
                <Button
                    size="lg"
                    onClick={handleStartGame}
                    disabled={players.length < 3}
                    className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 font-bold rounded-2xl pointer-events-auto"
                >
                    {t('setup.startGame')}
                    <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
            </div>
        </div>
    );
};

export default SetupPage;
