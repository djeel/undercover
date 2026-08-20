import { Theme } from '@astryxdesign/core/theme';
import { useEffect, useState, type ReactNode } from 'react';
import { undercoverTheme } from './undercover-theme';

export type ThemePreference = 'dark' | 'light' | 'system';

const storageKey = 'undercover-theme';

function initialPreference(): ThemePreference {
    const stored = globalThis.localStorage?.getItem(storageKey);
    return stored === 'light' || stored === 'system' || stored === 'dark' ? stored : 'dark';
}

export function AppTheme({ children }: { children: ReactNode }) {
    const [preference] = useState<ThemePreference>(initialPreference);
    return <Theme theme={undercoverTheme} mode={preference}>{children}</Theme>;
}

export function useThemePreference(): readonly [ThemePreference, (preference: ThemePreference) => void] {
    const [preference, setPreference] = useState<ThemePreference>(initialPreference);

    useEffect(() => {
        globalThis.localStorage?.setItem(storageKey, preference);
    }, [preference]);

    return [preference, setPreference] as const;
}
