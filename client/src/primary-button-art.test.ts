import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
const homePage = readFileSync(resolve(process.cwd(), 'src/pages/HomePage.tsx'), 'utf8')

describe('primary button artwork', () => {
  test('limits the ornamental asset to the large primary Local launch CTA', () => {
    expect(homePage).toContain('<Button variant="primary" size="lg" className="local-play-card__start"')

    const primaryRule = css.match(/\.local-play-card \.astryx-button\.local-play-card__start\[data-variant='primary'\]\[data-size='lg'\]\s*\{([^}]*)\}/s)?.[1]

    expect(primaryRule).toContain("url('../assets/button.png')")
    expect(primaryRule).toContain('background-size: cover')
    expect(primaryRule).toContain('background-repeat: no-repeat')
    expect(primaryRule).toContain('color: var(--color-on-accent)')
    expect(primaryRule).toContain('linear-gradient(rgb(0 0 0 / 0.52), rgb(0 0 0 / 0.52))')
  })
  test('keeps focus, disabled, and loading states legible over the accent color', () => {
    const focusRule = css.match(/\.local-play-card \.astryx-button\.local-play-card__start\[data-variant='primary'\]\[data-size='lg'\]:focus-visible\s*\{([^}]*)\}/s)?.[1]
    const inactiveRule = css.match(/\.local-play-card \.astryx-button\.local-play-card__start\[data-variant='primary'\]\[data-size='lg'\]:is\(:disabled, \[aria-disabled='true'\], \[aria-busy='true'\]\)\s*\{([^}]*)\}/s)?.[1]

    expect(focusRule).toContain('outline-color: var(--color-on-accent)')
    expect(inactiveRule).toContain('background-image: none')
    expect(inactiveRule).toContain('color: var(--color-on-accent)')
  })


  test('does not give secondary, tertiary, destructive, or icon buttons the ornamental asset', () => {
    const artRules = [...css.matchAll(/([^{}]+)\{[^{}]*button\.png[^{}]*\}/gs)].map((match) => match[1].trim())

    expect(artRules).toEqual([
      '.local-play-card .astryx-button.local-play-card__start[data-variant=\'primary\'][data-size=\'lg\']',
    ])
  })
})
