import { describe, expect, test } from 'vitest';
import { undercoverTheme } from '../src/theme/undercover-theme';

describe('Undercover theme', () => {
    test('uses the green semantic accent with white-safe primary-action foregrounds', () => {
        const lightAccent = '#43544d';
        const darkAccent = '#5a7c6c';

        expect(undercoverTheme.tokens['--color-accent']).toBe(`light-dark(${lightAccent}, ${darkAccent})`);
        expect(undercoverTheme.tokens['--color-on-accent']).toBe('#ffffff');

        for (const accent of [lightAccent, darkAccent]) {
            const [red, green, blue] = accent.match(/[\da-f]{2}/gi)!.map((channel) => {
                const value = Number.parseInt(channel, 16) / 255;
                return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
            });
            const contrastWithWhite = 1.05 / (0.2126 * red + 0.7152 * green + 0.0722 * blue + 0.05);

            expect(contrastWithWhite).toBeGreaterThanOrEqual(4.5);
        }
    });

    test('uses green-neutral surfaces and text tokens', () => {
        const expectedNeutralTokens = {
            '--color-background-body': 'light-dark(hsl(150 18% 97%), hsl(156 18% 7%))',
            '--color-background-surface': 'light-dark(hsl(150 12% 100%), hsl(154 15% 11%))',
            '--color-background-card': 'light-dark(hsl(150 12% 100%), hsl(152 13% 14%))',
            '--color-text-primary': 'light-dark(hsl(156 22% 12%), hsl(150 20% 96%))',
            '--color-text-secondary': 'light-dark(hsl(154 12% 34%), hsl(150 10% 74%))',
            '--color-data-neutral': 'hsl(152 10% 62%)',
        } as const;

        expect(undercoverTheme.tokens).toMatchObject(expectedNeutralTokens);

        for (const token of Object.keys(expectedNeutralTokens) as Array<keyof typeof expectedNeutralTokens>) {
            expect(undercoverTheme.tokens[token]).not.toMatch(/hsl\(25[02]\b/);
        }
    });
});
