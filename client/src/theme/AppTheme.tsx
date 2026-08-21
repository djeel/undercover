import { Theme } from '@astryxdesign/core/theme';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { undercoverTheme } from './undercover-theme';

export type ThemePreference = 'dark' | 'light' | 'system';

const storageKey = 'undercover-theme';

function initialPreference(): ThemePreference {
    const stored = globalThis.localStorage?.getItem(storageKey);
    return stored === 'light' || stored === 'system' || stored === 'dark' ? stored : 'dark';
}

type ThemePreferenceContextValue = readonly [ThemePreference, (preference: ThemePreference) => void];

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | undefined>(undefined);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
    const [preference, setPreference] = useState<ThemePreference>(initialPreference);

    useEffect(() => {
        globalThis.localStorage?.setItem(storageKey, preference);
    }, [preference]);

    return <ThemePreferenceContext value={[preference, setPreference]}><Theme theme={undercoverTheme} mode={preference}>{children}</Theme></ThemePreferenceContext>;
}

export function useThemePreference(): ThemePreferenceContextValue {
    const value = useContext(ThemePreferenceContext);
    if (!value) throw new Error('useThemePreference must be used within ThemePreferenceProvider');
    return value;
}
