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
});
