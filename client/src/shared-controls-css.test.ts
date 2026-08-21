import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

const normalizedCss = css.replace(/\s+/g, ' ')

function rules(source: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return [...source.matchAll(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 'g'))].map(match => match[1])
}

function ruleIn(source: string, selector: string, occurrence = 0) {
  const matches = rules(source, selector)
  const index = occurrence < 0 ? matches.length + occurrence : occurrence

  if (!matches[index]) throw new Error(`Missing CSS rule: ${selector}`)

  return matches[index]
}

function rule(selector: string, occurrence = 0) {
  return ruleIn(normalizedCss, selector, occurrence)
}

function block(source: string, opener: string) {
  const start = source.indexOf(opener)
  const openingBrace = source.indexOf('{', start)

  if (start < 0 || openingBrace < 0) throw new Error(`Missing CSS block: ${opener}`)

  let depth = 0

  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') depth -= 1
    if (depth === 0) return source.slice(openingBrace + 1, index)
  }

  throw new Error(`Unclosed CSS block: ${opener}`)
}

function controlRules() {
  return [...normalizedCss.matchAll(/\.astryx-(?:button|text-input)[^{]*\{([^}]*)\}/g)].map(match => match[1]).join(' ')
}

describe('shared Astryx controls', () => {
  test('defines complete semantic button states without artwork', () => {
    expect(rule('.astryx-button')).toContain('min-height: 2.75rem')
    expect(rule('.astryx-button')).toContain('border-radius: var(--radius-element)')

    expect(rule(".astryx-button[data-variant='primary']")).toContain('border-color: var(--color-accent)')
    expect(rule(".astryx-button[data-variant='primary']")).toContain('background-color: var(--color-accent)')
    expect(rule(".astryx-button[data-variant='secondary']")).toContain('border-color: var(--color-border-emphasized)')
    expect(rule(".astryx-button[data-variant='secondary']")).toContain('background-color: var(--color-background-surface)')
    expect(rule(".astryx-button[data-variant='ghost']")).toContain('background-color: transparent')
    expect(rule(".astryx-button[data-variant='destructive']")).toContain('border-color: var(--color-border-red)')
    expect(rule(".astryx-button[data-variant='destructive']")).toContain('background-color: var(--color-background-red)')

    for (const variant of ['primary', 'secondary', 'ghost', 'destructive']) {
      const hover = rule(`.astryx-button[data-variant='${variant}']:not(:is(:disabled, [aria-disabled='true'])):hover`)
      expect(hover).toContain('background-color:')
    }

    expect(rule(".astryx-button:not(:is(:disabled, [aria-disabled='true'])):active")).toContain('transform: translateY(1px)')
    expect(rule('.astryx-button:focus-visible')).toContain('outline: 3px solid var(--color-accent)')

    const loading = rule(".astryx-button[aria-busy='true']")
    expect(loading).toContain('opacity: .8')
    expect(loading).not.toContain('cursor: not-allowed')

    const disabled = rule(".astryx-button:is(:disabled, [aria-disabled='true'])")
    expect(disabled).toContain('cursor: not-allowed')
    expect(disabled).toContain('opacity: .58')
    expect(css).not.toContain('button.png')
    expect(css).not.toContain('--local-play-button-art')
    expect(controlRules()).not.toContain('button.png')
    expect(controlRules()).not.toContain('--local-play-button-art')
    expect(controlRules()).not.toContain('url(')
  })

  test('defines complete text-input states and reduced-motion fallback', () => {
    expect(rule('.astryx-text-input')).toContain('min-height: 2.75rem')
    expect(rule('.astryx-text-input')).toContain('border-radius: var(--radius-element)')
    expect(rule('.astryx-text-input')).toContain('border: 1px solid var(--color-border-emphasized)')
    expect(rule('.astryx-text-input')).toContain('background: var(--color-background-surface)')

    expect(rule('.astryx-text-input:focus-within')).toContain('border-color: var(--color-accent)')
    expect(rule('.astryx-text-input:focus-within')).toContain('box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent), transparent 74%)')
    expect(rule(".astryx-text-input:has(input[aria-invalid='true'])")).toContain('border-color: var(--color-border-red)')
    expect(rule(".astryx-text-input:has(input[aria-invalid='true'])")).toContain('box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-border-red), transparent 70%)')

    const disabled = rule(".astryx-text-input[data-disabled='disabled'], .astryx-text-input:has(input:is(:disabled, [aria-disabled='true']))")
    expect(disabled).toContain('cursor: not-allowed')
    expect(disabled).toContain('background: var(--color-background-muted)')
    expect(rule('.astryx-text-input input::placeholder')).toContain('color: color-mix(in srgb, var(--color-text-secondary), var(--color-text-primary) 18%)')

    const reducedMotion = block(normalizedCss, '@media (prefers-reduced-motion: reduce)')
    expect(ruleIn(reducedMotion, '.astryx-button')).toContain('transition: none;')
    expect(ruleIn(reducedMotion, '.astryx-text-input')).toContain('transition: none;')
  })
})
