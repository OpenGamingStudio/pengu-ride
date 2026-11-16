import pkg from '../package.json';
import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/config';
import { COSMETICS, DEFAULTS } from '../src/shop';

describe('version et catalogue', () => {
  it('VERSION suit package.json', () => {
    expect(VERSION).toBe(pkg.version);
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
  it('ids de cosmétiques uniques, chaque étagère a son défaut gratuit', () => {
    expect(new Set(COSMETICS.map((c) => c.id)).size).toBe(COSMETICS.length);
    for (const id of Object.values(DEFAULTS)) expect(COSMETICS.find((c) => c.id === id)?.price).toBe(0);
  });
});
