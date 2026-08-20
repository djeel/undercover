import { describe, expect, test } from 'vitest';
import { undercoverTheme } from '../src/theme/undercover-theme';


describe('Undercover theme accent', () => {
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
});
