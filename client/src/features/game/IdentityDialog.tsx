import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { useTranslation } from 'react-i18next';
import type { PlayerRole } from '@undercover/shared';
import civilianArt from '../../assets/roles/civilians.png';
import undercoverArt from '../../assets/roles/undercover.png';
import mrWhiteArt from '../../assets/roles/mrwhite.png';
import jesterArt from '../../assets/roles/jester.png';
import bodyguardArt from '../../assets/roles/bodyguard.png';
import { RoleRevealCard } from './RoleRevealCard';

export interface IdentityDialogProps {
    open: boolean;
    onClose: () => void;
    identity: {
        role: PlayerRole;
        word: string | null;
        bodyguardTargetName?: string;
    };
}

const roleKey: Record<PlayerRole, string> = {
    civilian: 'roles.civilian',
    undercover: 'roles.undercover',
    mr_white: 'roles.mrWhite',
    jester: 'roles.jester',
    bodyguard: 'roles.bodyguard',
};

const roleArt: Record<PlayerRole, string> = {
    civilian: civilianArt,
    undercover: undercoverArt,
    mr_white: mrWhiteArt,
    jester: jesterArt,
    bodyguard: bodyguardArt,
};

export function IdentityDialog({ open, onClose, identity }: IdentityDialogProps) {
    const { t } = useTranslation();

    return (
        <Dialog isOpen={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }} purpose="info" width="min(92vw, 420px)">
            <Layout
                header={<DialogHeader title={t('identity.title', 'Your identity')} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }} />}
                content={(
                    <LayoutContent>
                        <RoleRevealCard
                            open={open}
                            identity={identity}
                            roleLabel={t(roleKey[identity.role])}
                            roleArt={roleArt[identity.role]}
                            roleLabelCaption={t('identity.role', 'Role')}
                            wordLabelCaption={t('identity.word', 'Word')}
                            noWordLabel={t('identity.noWord', 'No word')}
                            revealLabel={t('identity.revealCard')}
                            protectLabel={(name) => t('identity.protect', 'Protect {{name}}', { name })}
                        />
                    </LayoutContent>
                )}
            />
        </Dialog>
    );
}
