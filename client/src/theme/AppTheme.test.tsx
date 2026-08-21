import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@astryxdesign/core/theme', () => ({
  defineTheme: <T,>(theme: T) => theme,
  Theme: ({ children, mode }: { children: ReactNode; mode: string }) => <div data-theme-mode={mode}>{children}</div>,
}))

import { ThemePreferenceProvider, useThemePreference } from './AppTheme'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let storedValues: Record<string, string>

function PreferenceProbe() {
  const [preference, setPreference] = useThemePreference()
  return <><output>{preference}</output><button onClick={() => setPreference('light')}>Light</button></>
}

describe('ThemePreferenceProvider', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    storedValues = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storedValues[key] ?? null,
      setItem: vi.fn((key: string, value: string) => { storedValues[key] = value }),
    })
  })

  afterEach(async () => {
    await act(async () => { root?.unmount() })
    container?.remove()
    vi.unstubAllGlobals()
  })

  async function renderProvider() {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => { root.render(<ThemePreferenceProvider><PreferenceProbe /></ThemePreferenceProvider>) })
  }

  test('shares preference changes with Astryx Theme and localStorage', async () => {
    await renderProvider()

    expect(container.querySelector('output')?.textContent).toBe('dark')
    expect(container.querySelector('[data-theme-mode]')?.getAttribute('data-theme-mode')).toBe('dark')

    await act(async () => { container.querySelector<HTMLButtonElement>('button')?.click() })

    expect(container.querySelector('output')?.textContent).toBe('light')
    expect(container.querySelector('[data-theme-mode]')?.getAttribute('data-theme-mode')).toBe('light')
    expect(localStorage.setItem).toHaveBeenLastCalledWith('undercover-theme', 'light')
  })

  test('falls back to dark for an invalid stored preference', async () => {
    localStorage.setItem('undercover-theme', 'invalid')

    await renderProvider()

    expect(container.querySelector('output')?.textContent).toBe('dark')
    expect(container.querySelector('[data-theme-mode]')?.getAttribute('data-theme-mode')).toBe('dark')
  })

  test('throws when useThemePreference is used outside the provider', () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    expect(() => act(() => { root?.render(<PreferenceProbe />) })).toThrowError(
      'useThemePreference must be used within ThemePreferenceProvider',
    )
  })
})
