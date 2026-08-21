import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
const homePage = readFileSync(resolve(process.cwd(), 'src/pages/HomePage.tsx'), 'utf8')

describe('Home primary action artwork', () => {
  test('removes obsolete Home artwork dependencies', () => {
    expect(homePage).not.toContain("../assets/button.png")
    expect(homePage).not.toContain("../assets/multiplayer.png")
    expect(css).not.toContain('--local-play-button-art')
  })
})
