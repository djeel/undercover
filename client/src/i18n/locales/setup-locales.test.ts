import { describe, expect, test } from 'vitest';
import en from './en.json';
import fr from './fr.json';

describe('setup translations', () => {
  test('provide localized setup guidance', () => {
    expect(en.setup.subtitle).toBeTruthy();
    expect(fr.setup.subtitle).toBeTruthy();
    expect(en.setup.subtitle).not.toBe('setup.subtitle');
    expect(fr.setup.subtitle).not.toBe('setup.subtitle');
  });

  test('provide matching identity reveal guidance', () => {
    expect(en.identity.holdCard).toBeTruthy()
    expect(fr.identity.holdCard).toBeTruthy()
    expect(en.identity.memorize).toBeTruthy()
    expect(fr.identity.memorize).toBeTruthy()
    expect(Object.keys(en.identity).sort()).toEqual(Object.keys(fr.identity).sort())
  })
});
