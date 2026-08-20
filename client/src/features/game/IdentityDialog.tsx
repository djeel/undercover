import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { useTranslation } from 'react-i18next';
import type { PlayerRole } from '@undercover/shared';

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

export function IdentityDialog({ open, onClose, identity }: IdentityDialogProps) {
    const { t } = useTranslation();
    const isMrWhite = identity.role === 'mr_white';

    return (
        <Dialog isOpen={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }} purpose="info" width="min(92vw, 420px)">
            <Layout
                header={<DialogHeader title={t('identity.title', 'Your identity')} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }} />}
                content={(
                    <LayoutContent>
                        <div className="identity-dialog-content">
                            <Text as="p" type="supporting">{t('identity.role', 'Role')}</Text>
                            <Text as="p" type="large" weight="bold">{t(roleKey[identity.role])}</Text>
                            <Text as="p" type="supporting">{t('identity.word', 'Word')}</Text>
                            <Text as="p" type="large" weight="bold">{isMrWhite ? t('identity.noWord', 'No word') : identity.word}</Text>
                            {identity.role === 'bodyguard' && identity.bodyguardTargetName && (
                                <Text as="p" type="body">{t('identity.protect', 'Protect {{name}}', { name: identity.bodyguardTargetName })}</Text>
                            )}
                        </div>
                    </LayoutContent>
                )}
            />
        </Dialog>
    );
}
