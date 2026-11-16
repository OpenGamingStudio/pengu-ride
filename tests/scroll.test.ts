/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { keepScroll } from '../src/scroll';
import src from '../src/ui.ts?raw';

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

describe('achat dans la boutique : la position ne bouge pas', () => {
  // liste simulée : le rendu vide la liste (scrollTop retombe à 0) puis la remplit
  const buyAt = (start: number) => {
    const list = { scrollTop: start };
    keepScroll(list, () => { list.scrollTop = 0; });
    return list.scrollTop;
  };
  it.each([['en haut', 0], ['au milieu', 260], ['en bas', 520]])('achat %s : scrollTop identique (à 1 px près)', (_n, top) => {
    expect(Math.abs(buyAt(top) - top)).toBeLessThanOrEqual(1);
  });
  it('ne contient aucun scrollIntoView ni focus() qui déplace la vue', () => {
    expect(src).not.toMatch(/scrollIntoView/);
    for (const m of src.matchAll(/\.focus\(([^)]*)\)/g)) expect(m[1]).toContain('preventScroll');
  });
});
