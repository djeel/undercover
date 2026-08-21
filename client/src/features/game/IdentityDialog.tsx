import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { useTranslation } from 'react-i18next';
import { IdentityRevealCard, type PrivateIdentity } from './IdentityRevealCard';

export interface IdentityDialogProps {
    open: boolean;
    onClose: () => void;
    identity: PrivateIdentity;
}


export function IdentityDialog({ open, onClose, identity }: IdentityDialogProps) {
    const { t } = useTranslation();

    return (
        <Dialog isOpen={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }} purpose="info" width="min(94vw, 32rem)">
            <Layout
                header={<DialogHeader title={t('identity.title', 'Your identity')} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }} />}
                content={(
                    <LayoutContent>
                        <IdentityRevealCard active={open} identity={identity} />
                    </LayoutContent>
                )}
            />
        </Dialog>
    );
}
