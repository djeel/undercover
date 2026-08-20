import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import i18n from '../src/i18n';
import { IdentityDialog } from '../src/features/game/IdentityDialog';

const renderDialog = (role: 'civilian' | 'undercover' | 'mr_white' | 'jester' | 'bodyguard', word: string | null, bodyguardTargetName?: string) => {
    i18n.changeLanguage('en');
    return renderToStaticMarkup(
        createElement(IdentityDialog, {
            open: true,
            onClose: () => undefined,
            identity: { role, word, bodyguardTargetName },
        }),
    );
};

describe('IdentityDialog', () => {
    it('shows only the current player role and word', () => {
        const markup = renderDialog('undercover', 'Cappuccino');

        expect(markup).toContain('Undercover');
        expect(markup).toContain('Cappuccino');
        expect(markup).not.toContain('Civilian');
        expect(markup).not.toContain('Composition');
    });

    it('explains that Mr. White has no word', () => {
        const markup = renderDialog('mr_white', null);

        expect(markup).toContain('Mr. White');
        expect(markup).toContain('No word');
        expect(markup).not.toContain('Cappuccino');
    });

    it('shows a Bodyguard target only to the Bodyguard', () => {
        const markup = renderDialog('bodyguard', 'Cappuccino', 'Mina');

        expect(markup).toContain('Bodyguard');
        expect(markup).toContain('Protect Mina');
    });
});
