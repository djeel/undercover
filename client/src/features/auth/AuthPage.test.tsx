import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, test, vi } from 'vitest'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const auth = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
}))

vi.mock('./AuthProvider', () => ({
  useAuth: () => ({
    signInWithOAuth: auth.signInWithOAuth,
    error: null,
    configurationError: null,
    isLoading: true,
    isAuthenticating: false,
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ state: null }),
  useNavigate: () => vi.fn(),
}))

vi.mock('@astryxdesign/core/Card', () => ({ Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock('@astryxdesign/core/Text', () => ({ Text: ({ children }: { children: React.ReactNode }) => <p>{children}</p> }))
vi.mock('@astryxdesign/core/Button', () => ({
  Button: ({ label, isLoading, onClick }: { label: string; isLoading?: boolean; onClick: () => void }) => <button disabled={isLoading} onClick={onClick}>{label}</button>,
}))
vi.mock('lucide-react', () => ({ Chrome: () => null, MessageCircle: () => null }))

import { AuthPage } from './AuthPage'

describe('AuthPage', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(async () => {
    await act(async () => { root?.unmount() })
    container?.remove()
  })

  test('keeps provider actions available while the anonymous session initializes', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => { root.render(<AuthPage />) })

    expect([...container.querySelectorAll('button')].slice(0, 2).every((button) => !button.disabled)).toBe(true)
  })
})
