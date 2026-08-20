import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import '../i18n'
import AccountPage from './AccountPage'
import PlayPage from './PlayPage'

describe('grouped navigation pages', () => {
  it('offers the existing local and multiplayer play routes', () => {
    const page = renderToStaticMarkup(<MemoryRouter><PlayPage /></MemoryRouter>)

    expect(page).toContain('href="/setup"')
    expect(page).toContain('Local play')
    expect(page).toContain('href="/lobby"')
    expect(page).toContain('Multiplayer')
  })

  it('offers the existing profile and settings routes', () => {
    const page = renderToStaticMarkup(<MemoryRouter><AccountPage /></MemoryRouter>)

    expect(page).toContain('href="/profile"')
    expect(page).toContain('Profile')
    expect(page).toContain('href="/settings"')
    expect(page).toContain('Settings')
  })
})
