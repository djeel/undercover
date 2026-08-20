import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

test('defines a responsive cinematic role-card reveal with safe motion fallbacks', () => {
  expect(css).toContain('aspect-ratio: 1055 / 1491')
  expect(css).toContain('transform-style: preserve-3d')
  expect(css).toContain('rotateY(calc(180deg + var(--identity-card-rotate-y)))')
  expect(css).toContain('.identity-reveal-card__back-art')
  expect(css).toContain('.identity-dialog-role-art')
  expect(css).toContain('object-fit: cover')
  expect(css).toContain('.identity-reveal-card__copy')
  expect(css).toContain('linear-gradient(to bottom, transparent')
  expect(css).toContain('@media (hover: hover) and (pointer: fine)')
  expect(css).toContain('@media (hover: none), (pointer: coarse)')
  expect(css).toContain('.identity-reveal-card.is-holding .identity-reveal-card__hold-progress')
  expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  expect(css).toContain('--identity-card-rotate-x: 0deg')
})
