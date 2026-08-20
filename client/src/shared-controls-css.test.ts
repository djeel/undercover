import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

describe('shared Astryx controls', () => {
  test('normalizes semantic button states without extending ornamental artwork', () => {
    expect(css).toContain(".astryx-button[data-variant='primary']")
    expect(css).toContain(".astryx-button[data-variant='secondary']")
    expect(css).toContain(".astryx-button[data-variant='ghost']")
    expect(css).toContain(".astryx-button[data-variant='destructive']")
    expect(css).toContain('.astryx-button:focus-visible')
    expect(css).toContain(".astryx-button:is(:disabled, [aria-disabled='true'], [aria-busy='true'])")
    expect(css).toContain('min-height: 2.75rem')
  })

  test('normalizes filled text-input states and motion fallback', () => {
    expect(css).toContain('.astryx-text-input {')
    expect(css).toContain('.astryx-text-input:focus-within')
    expect(css).toContain(".astryx-text-input:has(input[aria-invalid='true'])")
    expect(css).toContain('.astryx-text-input input::placeholder')
    expect(css).toContain('.astryx-text-input input {')
    expect(css).toContain('min-height: 2.75rem')
    expect(css).toContain('.astryx-text-input { transition: none; }')
  })
})
