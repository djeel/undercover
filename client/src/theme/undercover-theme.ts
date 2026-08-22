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
    components: {
        'text-input': {
            base: { paddingInline: '14px !important' },
        },
    },
    motion: { fast: 175, medium: 410, slow: 975, ratio: 0.75 },
    radius: { base: 4, multiplier: 2 },
    tokens: {
        '--color-accent': ['#43544d', '#5a7c6c'],
        '--color-on-accent': '#ffffff',
        '--color-background-body': ['hsl(150 18% 97%)', 'hsl(156 18% 7%)'],
        '--color-background-surface': ['hsl(150 12% 100%)', 'hsl(154 15% 11%)'],
        '--color-background-card': ['hsl(150 14% 98.5%)', 'hsl(152 13% 14%)'],
        '--color-text-primary': ['hsl(156 22% 12%)', 'hsl(150 20% 96%)'],
        '--color-text-secondary': ['hsl(154 12% 34%)', 'hsl(150 10% 74%)'],
        '--color-data-categorical-blue': 'hsl(220 80% 58%)',
        '--color-data-categorical-orange': 'hsl(28 90% 56%)',
        '--color-data-categorical-pink': 'hsl(346 87% 60%)',
        '--color-data-categorical-green': 'hsl(152 68% 52%)',
        '--color-data-categorical-teal': 'hsl(180 70% 50%)',
        '--color-data-neutral': 'hsl(152 10% 62%)',
        '--radius-element': '12px',
        '--radius-container': '16px',
        '--duration-fast': '175ms',
        '--duration-medium': '410ms',
    },
});
