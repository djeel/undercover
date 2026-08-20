import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

test('defines a private 3D role-card reveal with safe motion fallbacks', () => {
  expect(css).toContain('.identity-reveal-card {')
  expect(css).toContain('perspective: 1000px')
  expect(css).toContain('.identity-reveal-card__inner {')
  expect(css).toContain('transform-style: preserve-3d')
  expect(css).toContain('.identity-reveal-card.is-revealed .identity-reveal-card__inner')
  expect(css).toContain('rotateY(180deg)')
  expect(css).toContain('@media (hover: hover) and (pointer: fine)')
  expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  expect(css).toContain('.identity-reveal-card__inner { transition: none; transform: none; }')
})
