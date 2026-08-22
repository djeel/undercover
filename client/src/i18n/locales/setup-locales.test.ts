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

  test('keeps player action translations in locale parity', () => {
    expect(Object.keys(en.game).sort()).toEqual(Object.keys(fr.game).sort())
    expect(en.game.viewRole).toBeTruthy()
    expect(fr.game.viewRole).toBeTruthy()
    expect(en.game.confirmEliminationTitle).toBeTruthy()
    expect(fr.game.confirmEliminationTitle).toBeTruthy()
    expect(en.game.confirmEliminationDescription).toBeTruthy()
    expect(fr.game.confirmEliminationDescription).toBeTruthy()
    expect(en.game.confirmElimination).toBeTruthy()
    expect(fr.game.confirmElimination).toBeTruthy()
    expect(en.common.cancel).toBeTruthy()
    expect(fr.common.cancel).toBeTruthy()
    for (const locale of [en, fr]) {
      expect(locale.game).not.toHaveProperty('voter')
      expect(locale.game).not.toHaveProperty('selectPlayer')
      expect(locale.game).not.toHaveProperty('votesRecorded')
    }
  })

  test('omits retired dashboard online action copy', () => {
    for (const locale of [en, fr]) {
      expect(locale.dashboard).not.toHaveProperty('onlineTitle');
      expect(locale.dashboard).not.toHaveProperty('createRoom');
      expect(locale.dashboard).not.toHaveProperty('joinRoom');
    }
  });
});

test('provides complete tutorial copy in both locales', () => {
  const tutorialKeys = ['conceptTitle', 'conceptDesc', 'rolesTitle', 'rolesDesc', 'gameTitle', 'gameDesc', 'next', 'finish'] as const
  for (const locale of [en, fr]) {
    for (const key of tutorialKeys) expect(locale.tutorial[key]).toBeTruthy()
  }
  expect(Object.keys(en.tutorial).sort()).toEqual(Object.keys(fr.tutorial).sort())
})
