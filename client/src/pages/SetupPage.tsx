import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { validateLocalComposition } from '../features/local-game/composition';
import { useLocalGameStore, type LocalGameConfig } from '../features/local-game/local-game-store';

type RoleCounter = {
    key: keyof Pick<LocalGameConfig, 'undercoverCount' | 'mrWhiteCount' | 'jesterCount' | 'bodyguardCount'>;
    role: 'undercover' | 'mrWhite' | 'jester' | 'bodyguard';
    minimum: number;
    maximum?: number;
    required?: boolean;
};

const roleCounters: readonly RoleCounter[] = [
    { key: 'undercoverCount', role: 'undercover', minimum: 1, required: true },
    { key: 'mrWhiteCount', role: 'mrWhite', minimum: 0 },
    { key: 'jesterCount', role: 'jester', minimum: 0 },
    { key: 'bodyguardCount', role: 'bodyguard', minimum: 0, maximum: 1 },
];

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
    const [nameError, setNameError] = useState('');
    const [startError, setStartError] = useState('');
    const composition = validateLocalComposition(players.length, config);
    const validationMessage = composition.valid ? '' : t(`setup.validation.${composition.reason}`);
    const add = () => {
        const result = addPlayer(name);
        if (!result.ok) {
            setNameError(t(`setup.${result.reason}`));
            return;
        }
        setName('');
        setNameError('');
    };

    const updateCount = (counter: RoleCounter, change: -1 | 1) => {
        const specialRoleLimit = Math.max(0, players.length - 2);
        const current = config[counter.key];
        const total = roleCounters.reduce((sum, { key }) => sum + config[key], 0);
        const maximum = Math.max(counter.minimum, Math.min(counter.maximum ?? specialRoleLimit, specialRoleLimit - total + current));
        const next = Math.min(maximum, Math.max(counter.minimum, current + change));

        if (next !== current) updateConfig({ [counter.key]: next } as Pick<LocalGameConfig, typeof counter.key>);
        setStartError('');
    };

    const start = () => {
        if (!startGame()) {
            setStartError(validationMessage || t('setup.validation.counts'));
            return;
        }
        navigate('/reveal');
    };

    return <section className="space-y-7">
        <header>
            <h1 className="text-3xl font-bold">{t('setup.title')}</h1>
            <Text as="p" type="supporting">{t('setup.subtitle')}</Text>
        </header>

        <Card>
            <div className="setup-players-card">
                <TextInput label={t('setup.playerName')} value={name} onChange={(value) => { setName(value); if (nameError) setNameError(''); }} onEnter={add} width="100%" status={nameError ? { type: 'error', message: nameError } : undefined} />
                <Button variant="secondary" label={t('setup.addPlayer')} onClick={add} width="100%" />
                <div className="divide-y divide-[var(--color-border)]">
                    {players.map((player) => <div key={player.id} className="flex items-center justify-between py-3">
                        <span>{player.displayName}</span>
                        <Button variant="ghost" icon={<Trash2 aria-hidden="true" />} isIconOnly label={t('common.remove')} onClick={() => removePlayer(player.id)} />
                    </div>)}
                </div>
            </div>
        </Card>

        <Card>
            <h2 className="text-lg font-bold">{t('setup.settings')}</h2>
            <div className="space-y-4 p-5">
                <div className="mt-1 divide-y divide-[var(--color-border)]">
                    {roleCounters.map((counter) => {
                        const roleName = t(`roles.${counter.role}`);
                        const specialRoleLimit = Math.max(0, players.length - 2);
                        const total = roleCounters.reduce((sum, { key }) => sum + config[key], 0);
                        const maximum = Math.max(counter.minimum, Math.min(counter.maximum ?? specialRoleLimit, specialRoleLimit - total + config[counter.key]));
                        const canDecrease = config[counter.key] > counter.minimum;
                        const canIncrease = config[counter.key] < maximum;

                        return <div className="flex items-center justify-between gap-4 py-4" key={counter.key} role="group" aria-label={roleName}>
                            <div className="min-w-0">
                                <h3 className="font-semibold">{roleName}{counter.required ? <span aria-hidden="true"> · {t('setup.required')}</span> : null}</h3>
                                <Text as="p" type="supporting">{t(`roleDescriptions.${counter.role}`)}</Text>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <Button className="min-h-11 min-w-11" variant="secondary" icon={<Minus aria-hidden="true" />} isIconOnly label={t('setup.decreaseRole', { role: roleName })} isDisabled={!canDecrease} onClick={() => updateCount(counter, -1)} />
                                <output className="min-w-8 text-center text-2xl font-bold tabular-nums" aria-live="polite">{config[counter.key]}</output>
                                <Button className="min-h-11 min-w-11" variant="secondary" icon={<Plus aria-hidden="true" />} isIconOnly label={t('setup.increaseRole', { role: roleName })} isDisabled={!canIncrease} onClick={() => updateCount(counter, 1)} />
                            </div>
                        </div>;
                    })}
                </div>
                {!composition.valid && <Text as="p" type="supporting" role="status">{validationMessage}</Text>}
            </div>
        </Card>

        {startError && <p role="alert">{startError}</p>}
        <Button variant="primary" label={t('setup.startGame')} isDisabled={!composition.valid} onClick={start} width="100%" />
    </section>;
};

export default SetupPage;
