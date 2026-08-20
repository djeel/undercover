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
    it('keeps the current player role and word private until reveal', () => {
        const markup = renderDialog('undercover', 'Cappuccino');

        expect(markup).toContain('Reveal private identity');
        expect(markup).not.toContain('Undercover');
        expect(markup).not.toContain('Cappuccino');
        expect(markup).not.toContain('Civilian');
        expect(markup).not.toContain('Composition');
    });

    it('keeps Mr. White role details private until reveal', () => {
        const markup = renderDialog('mr_white', null);

        expect(markup).toContain('Reveal private identity');
        expect(markup).not.toContain('Mr. White');
        expect(markup).not.toContain('No word');
        expect(markup).not.toContain('Cappuccino');
    });

    it('keeps a Bodyguard target private until reveal', () => {
        const markup = renderDialog('bodyguard', 'Cappuccino', 'Mina');

        expect(markup).toContain('Reveal private identity');
        expect(markup).not.toContain('Bodyguard');
        expect(markup).not.toContain('Protect Mina');
    });
});
