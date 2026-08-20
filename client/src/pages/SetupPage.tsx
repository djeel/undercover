import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { Trash2 } from 'lucide-react';
import { useLocalGameStore } from '../features/local-game/local-game-store';

const SetupPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const players = useLocalGameStore((state) => state.players);
    const config = useLocalGameStore((state) => state.config);
    const addPlayer = useLocalGameStore((state) => state.addPlayer);
    const removePlayer = useLocalGameStore((state) => state.removePlayer);
    const updateConfig = useLocalGameStore((state) => state.updateConfig);
    const startGame = useLocalGameStore((state) => state.startGame);
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const add = () => {
        if (!addPlayer(name)) { setError(t('setup.invalidName', 'Choose a unique name.')); return; }
        setName(''); setError('');
    };
    const start = () => { if (players.length >= 3) { startGame(); navigate('/reveal'); } else setError(t('setup.minPlayers')); };

    return <section className="space-y-7"><header><h1 className="text-3xl font-bold">{t('setup.title')}</h1><Text as="p" type="supporting">{t('setup.subtitle')}</Text></header><Card><div className="space-y-4 p-5"><TextInput label={t('setup.playerName')} value={name} onChange={setName} onEnter={add} width="100%" status={error ? { type: 'error', message: error } : undefined} /><Button variant="secondary" label={t('setup.addPlayer')} onClick={add} width="100%" /><div className="divide-y divide-[var(--color-border)]">{players.map((player) => <div key={player.id} className="flex items-center justify-between py-3"><span>{player.displayName}</span><Button variant="ghost" icon={<Trash2 aria-hidden="true" />} isIconOnly label={t('common.remove', 'Remove')} onClick={() => removePlayer(player.id)} /></div>)}</div></div></Card><Card><div className="space-y-4 p-5"><h2 className="text-lg font-bold">{t('setup.wordPair')}</h2><TextInput label={t('setup.civilianWord')} value={config.civilianWord} onChange={(civilianWord) => updateConfig({ civilianWord })} width="100%" /><TextInput label={t('setup.undercoverWord')} value={config.undercoverWord} onChange={(undercoverWord) => updateConfig({ undercoverWord })} width="100%" /><TextInput label={t('roles.undercover')} value={String(config.undercoverCount)} onChange={(value) => updateConfig({ undercoverCount: Math.max(1, Number(value) || 1) })} width="100%" /></div></Card><Button variant="primary" label={t('setup.startGame')} isDisabled={players.length < 3} onClick={start} width="100%" /></section>;
};

export default SetupPage;
