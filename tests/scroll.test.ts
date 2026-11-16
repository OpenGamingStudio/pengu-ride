import { describe, expect, it } from 'vitest';
import { keepScroll } from '../src/scroll';

describe('keepScroll', () => {
  it('restaure la position après un rendu qui la remet à 0', () => {
    const list = { scrollTop: 340 };
    keepScroll(list, () => { list.scrollTop = 0; });
    expect(list.scrollTop).toBe(340);
  });
  it('reset (changement d\'onglet) revient en haut', () => {
    const list = { scrollTop: 340 };
    keepScroll(list, () => undefined, true);
    expect(list.scrollTop).toBe(0);
  });
});
