import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral';

export const undercoverTheme = defineTheme({
    name: 'undercover',
    extends: neutralTheme,
    color: { accent: '#43544d', neutralStyle: 'cool', contrast: 'standard' },
    typography: {
        scale: { base: 16, ratio: 1.2 },
        body: { family: 'Manrope', fallbacks: 'system-ui, sans-serif' },
        heading: { family: 'Syne', fallbacks: 'system-ui, sans-serif', weight: 'bold', weights: { 1: 'bold', 2: 'bold', 3: 'bold' } },
    },
    radius: { base: 4, multiplier: 2 },
    motion: { fast: 175, medium: 410, slow: 975, ratio: 0.75 },
    tokens: {
        '--color-accent': ['#43544d', '#5a7c6c'],
        '--color-on-accent': '#ffffff',
        '--color-background-body': ['hsl(250 35% 97%)', 'hsl(252 28% 8%)'],
        '--color-background-surface': ['hsl(0 0% 100%)', 'hsl(252 24% 12%)'],
        '--color-background-card': ['hsl(0 0% 100%)', 'hsl(252 22% 15%)'],
        '--color-text-primary': ['hsl(252 30% 12%)', 'hsl(250 40% 97%)'],
        '--color-text-secondary': ['hsl(252 16% 34%)', 'hsl(250 14% 74%)'],
        '--color-data-categorical-blue': 'hsl(220 80% 58%)',
        '--color-data-categorical-orange': 'hsl(28 90% 56%)',
        '--color-data-categorical-pink': 'hsl(346 87% 60%)',
        '--color-data-categorical-green': 'hsl(152 68% 52%)',
        '--color-data-categorical-teal': 'hsl(180 70% 50%)',
        '--color-data-neutral': 'hsl(250 12% 62%)',
        '--radius-element': '12px',
        '--radius-container': '16px',
        '--duration-fast': '175ms',
        '--duration-medium': '410ms',
    },
});
