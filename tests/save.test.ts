import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../src/config';
import { freshSave, load, write, type Store } from '../src/save';
import { buy, buyUpgrade, cheapestUpgrade, equip, nextAffordable, upgradeCost } from '../src/shop';

function fake(init: Record<string, string> = {}): Store & { m: Record<string, string> } {
  const m = { ...init };
  return { m, getItem: (k) => m[k] ?? null, setItem: (k, v) => void (m[k] = v) };
}

describe('sauvegarde', () => {
  it('repart d\'une sauvegarde neuve', () => {
    const l = load(fake());
    expect(l.data).toEqual(freshSave());
    expect(l.persistent).toBe(true);
  });

  it('aller-retour : record, poissons, achats', () => {
    const st = fake();
    const l = load(st);
    l.data.best = 120;
    l.data.coins = 300;
    expect(buy(l.data, 'hat.red')).toBe('ok');
    expect(buyUpgrade(l.data, 'power')).toBe('ok');
    expect(write(st, l)).toBe(true);
    const d = load(st).data;
    expect(d.best).toBe(120);
    expect(d.owned).toContain('hat.red');
    expect(d.equipped.hat).toBe('hat.red');
    expect(d.up.power).toBe(1);
  });

  it('JSON corrompu : copie conservée, partie neuve', () => {
    const st = fake({ [SAVE_KEY]: '{pas du json' });
    expect(load(st).data).toEqual(freshSave());
    expect(st.m[SAVE_KEY + '.corrupt']).toBe('{pas du json');
    for (const bad of ['null', '[1]', '"x"', '12']) expect(load(fake({ [SAVE_KEY]: bad })).data).toEqual(freshSave());
  });

  it('version future : lecture seule', () => {
    const st = fake({ [SAVE_KEY]: JSON.stringify({ v: 99, best: 7 }) });
    const l = load(st);
    expect(l.data.best).toBe(7);
    expect(write(st, l)).toBe(false);
    expect(JSON.parse(st.m[SAVE_KEY]!).v).toBe(99);
  });

  it('valide les valeurs inventées', () => {
    const st = fake({
      [SAVE_KEY]: JSON.stringify({
        v: 1, best: -4, coins: 'beaucoup', totalFish: 3.9, owned: ['hat.red', 'hat.truc', 5],
        equipped: { hat: 'hat.chef', scarf: 'hat.red', glasses: 'glasses.sun' }, up: { power: 99, bounce: -1, magnet: 'x' },
      }),
    });
    const d = load(st).data;
    expect(d.best).toBe(0);
    expect(d.coins).toBe(0);
    expect(d.totalFish).toBe(3);
    expect(d.owned).toContain('hat.red');
    expect(d.owned).not.toContain('hat.truc');
    expect(d.equipped.hat).toBe('hat.none');
    expect(d.equipped.scarf).toBe('scarf.none');
    expect(d.equipped.glasses).toBe('glasses.none');
    expect(d.up).toEqual({ power: 8, bounce: 0, glide: 0, magnet: 0, fishx: 0 });
  });

  it('stockage absent ou qui jette', () => {
    expect(load(null).persistent).toBe(false);
    const boom: Store = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    const l = load(boom);
    expect(l.persistent).toBe(false);
    expect(write(boom, l)).toBe(false);
  });
});

describe('boutique', () => {
  it('un achat débite, équipe, et refuse sans assez de poissons', () => {
    const s = freshSave();
    s.coins = 39;
    expect(buy(s, 'hat.red')).toBe('poor');
    s.coins = 100;
    expect(buy(s, 'hat.red')).toBe('ok');
    expect(s.coins).toBe(60);
    expect(s.equipped.hat).toBe('hat.red');
    expect(buy(s, 'hat.red')).toBe('owned');
    expect(buy(s, 'inconnu')).toBe('unknown');
    expect(equip(s, 'hat.none')).toBe(true);
    expect(equip(s, 'hat.chef')).toBe(false);
  });

  it('les améliorations coûtent de plus en plus et plafonnent à 8', () => {
    const s = freshSave();
    s.coins = 100000;
    expect(upgradeCost('magnet', 1)).toBeGreaterThan(upgradeCost('magnet', 0));
    for (let i = 0; i < 8; i++) expect(buyUpgrade(s, 'magnet')).toBe('ok');
    expect(buyUpgrade(s, 'magnet')).toBe('max');
    s.coins = 1;
    expect(buyUpgrade(s, 'power')).toBe('poor');
  });

  it('propose un achat abordable', () => {
    const s = freshSave();
    expect(nextAffordable(s)).toBeNull();
    s.coins = 20;
    expect(nextAffordable(s)).toBe('Fronde costaude');
  });

  it('le premier achat est à portée d\'une seule partie courte, le bouton pointe le moins cher', () => {
    const s = freshSave();
    const c = cheapestUpgrade(s)!;
    expect(c.cost).toBeLessThanOrEqual(6);
    expect(c.id).toBe('power');
    s.up.power = 1;
    expect(cheapestUpgrade(s)!.id).toBe('glide');
    for (const k of Object.keys(s.up) as (keyof typeof s.up)[]) s.up[k] = 8;
    expect(cheapestUpgrade(s)).toBeNull();
  });
});

describe('compte : sanitize d’une sauvegarde reçue', () => {
  it('rejette les valeurs dangereuses venant du compte', async () => {
    const { sanitize } = await import('../src/save');
    const s = sanitize({ best: -5, coins: 'x', totalFish: 1e3, owned: ['nope'], up: { power: 999 } });
    expect(s.best).toBe(0);
    expect(s.coins).toBe(0);
    expect(s.totalFish).toBe(1000);
    expect(s.owned).not.toContain('nope');
    expect(s.up.power).toBeLessThanOrEqual(8);
  });
});
